/**
 * 统一埋点追踪 SDK
 *
 * 合并了原来分开的 featureTracker 和 actionTracker：
 * - 功能埋点（feature）：记录"用了什么指令"，由中间件自动触发
 * - 行为事件（action）：记录"操作结果如何"，由业务逻辑手动调用
 *
 * 共享同一份 config 读取、上下文、HTTP 发送逻辑。
 * 两种事件各自维护缓冲队列，发往不同 API 端点。
 * 设计为 fire-and-forget，不影响主流程性能。
 *
 * 位于 `src/analytics/` 而不是 `src/model/`：这里只做面向第三方分析平台的
 * 埋点上报（fire-and-forget HTTP），不读写任何游戏状态，也不依赖 `@src/db`。
 */
import { getCurrentEvent, logger } from 'alemonjs';
import { randomUUID } from 'node:crypto';
import { getAppConfig } from '../utils/appConfig';
import { getBackendConfig } from '../api/bot/config';
import { getQQBotAppId, getQQBotAppIds } from '../utils/qqBotIdentity';
import { classifyFeature } from './classifier';

// ==================== 公共基础设施 ====================

/** 事件上下文只属于当前异步请求，不能沿用上一台机器人的信息。 */
export interface TrackContext {
  appid?: string;
  scene?: string;
  channelId?: string;
  platform?: string;
}

const contexts = new WeakMap<object, TrackContext>();

export function setTrackContext(ctx: TrackContext): void {
  const event = getCurrentEvent<'message.create'>();

  if (event) {
    contexts.set(event, ctx);
  }
}

function currentContext(): TrackContext {
  const event = getCurrentEvent<'message.create'>();

  if (!event) {
    return {};
  }

  return {
    appid: event.Platform === 'qq-bot' ? String(event.BotId ?? '') : '',
    scene: event.IsPrivate ? 'private' : 'public',
    channelId: String(event.ChannelId ?? ''),
    platform: String(event.Platform ?? ''),
    ...contexts.get(event)
  };
}

/** 在入队时捕获配置，定时发送时不再读取其他机器人的运行上下文。 */
function getAnalyticsConfig(ctx: TrackContext = currentContext()) {
  const config = getAppConfig();
  const apiUrl = String(config.analytics_api_url ?? '')
    .trim()
    .replace(/\/+$/, '');
  const apiKey = String(config.analytics_api_key ?? '').trim();

  if (!apiUrl || !apiKey) {
    return null;
  }
  const backend = getBackendConfig();

  if (apiUrl === backend.url) {
    return null;
  }
  const ids = getQQBotAppIds();
  const appid = ctx.platform === 'qq-bot' ? ctx.appid : ctx.platform ? '' : getQQBotAppId();

  if (!ids.length) {
    return null;
  }
  if (!appid || !ids.includes(appid) || (backend.channelMode && appid !== backend.channelBotId)) {
    logger.error('[logap] 事件缺少有效的 QQ 机器人身份，本次不上报');

    return null;
  }

  return { apiUrl, apiKey, appid };
}

// ==================== 通用批量发送器 ====================

const retryRetained = new Set<() => void>();

/** Explicit replay after operators fix a rejected upload; original batch identity is preserved. */
export const retryRetainedAnalyticsBatches = () => {
  for (const retry of retryRetained) {
    retry();
  }
};
const deliveryStatus = { pending: 0, retained: 0, dropped: 0 };

/** In-memory delivery health; retained batches survive errors, not process restarts. */
export const getAnalyticsDeliveryStatus = () => ({ ...deliveryStatus });

function createBatchSender<T>(endpoint: string, bufferSize: number, flushMs: number) {
  type Route = NonNullable<ReturnType<typeof getAnalyticsConfig>>;
  type Queue = { route: Route; buffer: T[]; timer?: ReturnType<typeof setTimeout> };
  type Batch = { id: string; route: Route; body: string; count: number; attempts: number; retained: boolean };
  const queues = new Map<string, Queue>();
  const pending = new Map<string, Batch>();
  const maxBatches = 100;

  async function deliver(batch: Batch): Promise<void> {
    batch.attempts++;
    const { apiUrl, apiKey, appid } = batch.route;
    let retryable = false;
    let reason = '网络请求失败';
    let status = 'network';

    try {
      // Old servers return 404 here, so retries can never hit a non-idempotent endpoint.
      const res = await fetch(`${apiUrl}${endpoint}/batches?appid=${encodeURIComponent(appid)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey, 'Idempotency-Key': batch.id },
        body: batch.body,
        signal: AbortSignal.timeout(10000)
      });

      status = String(res.status);
      let result: { code?: number; message?: string; data?: { received?: number } } | undefined;

      try {
        result = JSON.parse(await res.text());
      } catch {
        // Never log a proxy HTML response or request payload.
      }
      if (res.ok && result?.code === 0 && result.data?.received === batch.count) {
        pending.delete(batch.id);
        deliveryStatus.pending--;

        return;
      }
      retryable = res.status === 408 || res.status === 429 || res.status >= 500;
      reason = typeof result?.message === 'string' ? result.message.replace(/[\r\n]/g, ' ').slice(0, 500) : '缺少有效的批次入库回执';
    } catch {
      retryable = true;
    }
    logger.error(`[logap] ${endpoint} 上报失败: ${status}; appid=${appid}; batch=${batch.id}; events=${batch.count}; attempt=${batch.attempts}; ${reason}`);
    if (retryable && batch.attempts < 3) {
      setTimeout(
        () => {
          void deliver(batch);
        },
        1000 * 2 ** (batch.attempts - 1)
      );
    } else {
      batch.retained = true;
      deliveryStatus.retained++;
      logger.error(`[logap] 批次已保留在内存: batch=${batch.id}; retained=${deliveryStatus.retained}; 自动重试已停止`);
    }
  }

  retryRetained.add(() => {
    for (const batch of pending.values()) {
      if (!batch.retained) {
        continue;
      }
      batch.retained = false;
      batch.attempts = 0;
      deliveryStatus.retained--;
      void deliver(batch);
    }
  });

  function flush(key: string, queue: Queue): void {
    queues.delete(key);
    if (queue.timer) {
      clearTimeout(queue.timer);
    }
    if (pending.size >= maxBatches) {
      // Evict only an exhausted batch, never a request awaiting an acknowledgement.
      const oldest = [...pending.values()].find(batch => batch.retained);

      if (oldest) {
        pending.delete(oldest.id);
        deliveryStatus.retained--;
        deliveryStatus.pending--;
        deliveryStatus.dropped += oldest.count;
        logger.error(`[logap] 保留队列已满，淘汰批次: batch=${oldest.id}; events=${oldest.count}`);
      } else {
        deliveryStatus.dropped += queue.buffer.length;
        logger.error(`[logap] 在途队列已满，本批次未入队: appid=${queue.route.appid}; events=${queue.buffer.length}`);

        return;
      }
    }
    const batch: Batch = {
      id: randomUUID(),
      route: queue.route,
      body: JSON.stringify({ appid: queue.route.appid, events: queue.buffer }),
      count: queue.buffer.length,
      attempts: 0,
      retained: false
    };

    pending.set(batch.id, batch);
    deliveryStatus.pending++;
    void deliver(batch);
  }

  return {
    push(item: T, ctx: TrackContext = currentContext()) {
      const route = getAnalyticsConfig(ctx);

      if (!route) {
        return;
      }
      const key = JSON.stringify([route.apiUrl, route.appid, route.apiKey]);
      let queue = queues.get(key);

      if (!queue) {
        queue = { route, buffer: [] };
        queues.set(key, queue);
      }
      queue.buffer.push(item);
      const pendingQueue = queue;

      if (queue.buffer.length >= bufferSize) {
        flush(key, pendingQueue);
      } else {
        queue.timer ??= setTimeout(() => {
          flush(key, pendingQueue);
        }, flushMs);
      }
    }
  };
}

// ==================== 功能埋点（Feature Events） ====================

interface FeaturePayload {
  uid: number;
  feature_name: string;
  feature_category: string;
  command_text: string;
  response_time_ms: number;
  success: boolean;
  scene: string;
  channel_id: string;
  platform: string;
  timestamp: string;
}

const featureSender = createBatchSender<FeaturePayload>('/api/v2/track/features', 50, 5000);

/**
 * 在埋点侧分类后入队，异步上报分析平台
 * @param _bid 平台用户 ID，保留现有调用签名
 * @param uid 用户ID
 * @param commandText 用户输入的原始文本
 * @param startTime 指令开始处理的时间戳
 * @param success 是否成功
 * @param ctx 可选上下文覆盖（不传则用当前事件上下文）
 */
export function trackFeatureEvent(_bid: string, uid: number, commandText: string, startTime?: number, success = true, ctx?: TrackContext): void {
  const responseTimeMs = startTime ? Date.now() - startTime : 0;

  const timestamp = new Date().toISOString();

  try {
    const classification = classifyFeature(commandText);

    if (!classification) {
      return;
    }

    const context = { ...currentContext(), ...ctx };

    featureSender.push(
      {
        uid,
        feature_name: classification.feature_name,
        feature_category: classification.feature_category,
        command_text: commandText.substring(0, 255),
        response_time_ms: responseTimeMs,
        success,
        scene: context.scene ?? '',
        channel_id: context.channelId ?? '',
        platform: context.platform ?? '',
        timestamp
      },
      context
    );
  } catch (error) {
    logger.error('[logap] 分类失败:', error);
  }
}

// ==================== 行为事件（Action Events） ====================

/** 行为事件分类 */
export type ActionCategory = '修炼' | '战斗' | '社交' | '经济' | '成长' | '日常';
/** 行为事件结果 */
export type ActionResult = 'success' | 'fail' | 'draw';

interface ActionPayload {
  uid: number;
  action: string;
  category: ActionCategory;
  result: ActionResult;
  value: number;
  detail: string;
  scene: string;
  channel_id: string;
  platform: string;
  timestamp: string;
}

const actionSender = createBatchSender<ActionPayload>('/api/v2/track/actions', 30, 8000);

/** 记录一条行为事件 */
export function trackAction(
  uid: number,
  action: string,
  category: ActionCategory,
  result: ActionResult,
  value = 0,
  detail: Record<string, unknown> = {}
): void {
  try {
    const context = currentContext();

    actionSender.push({
      uid,
      action,
      category,
      result,
      value,
      detail: JSON.stringify(detail),
      scene: context.scene ?? '',
      channel_id: context.channelId ?? '',
      platform: context.platform ?? '',
      timestamp: new Date().toISOString()
    });
  } catch {
    // 静默失败
  }
}

// ==================== 便捷上报函数 ====================

/** 突破事件 */
export function trackBreakthrough(
  uid: number,
  success: boolean,
  detail: { newRealm?: string; oldRealm?: string; hasTribulation?: boolean; debuff?: boolean }
): void {
  trackAction(uid, 'breakthrough', '修炼', success ? 'success' : 'fail', 0, detail);
}

/** 晋级事件 */
export function trackPromotion(
  uid: number,
  success: boolean,
  detail: { newRealm?: string; oldRealm?: string; tribulationPassed?: boolean; debuffHours?: number }
): void {
  trackAction(uid, 'promotion', '修炼', success ? 'success' : 'fail', 0, detail);
}

/** 秘境事件 */
export function trackDungeon(
  uid: number,
  success: boolean,
  detail: { dungeonId?: number; dungeonName?: string; participantCount?: number; winner?: string; rounds?: number }
): void {
  trackAction(uid, 'dungeon', '战斗', success ? 'success' : 'fail', 0, detail);
}

/** 扫荡秘境事件 */
export function trackDungeonSweep(uid: number, detail: { dungeonName?: string; times?: number; totalExp?: number; totalSpiritCost?: number }): void {
  trackAction(uid, 'dungeon_sweep', '战斗', 'success', detail.times ?? 0, detail);
}

/** 比试事件 */
export function trackSpar(uid: number, result: ActionResult, detail: { targetId?: number; totalRounds?: number; totalWaves?: number }): void {
  trackAction(uid, 'spar', '战斗', result, 0, detail);
}

/** 妖塔挑战事件 */
export function trackDemonTower(
  uid: number,
  success: boolean,
  detail: { starsEarned?: number; scoreEarned?: number; layerCleared?: boolean; allCleared?: boolean; nextLayer?: number }
): void {
  trackAction(uid, 'demon_tower', '战斗', success ? 'success' : 'fail', detail.starsEarned ?? 0, detail);
}

/** 妖塔扫荡事件 */
export function trackDemonTowerSweep(uid: number, detail: { layersSwept?: number; totalScore?: number; totalSpiritStone?: number }): void {
  trackAction(uid, 'demon_tower_sweep', '战斗', 'success', detail.layersSwept ?? 0, detail);
}

/** 交易所上架事件 */
export function trackMarketList(uid: number, success: boolean, detail: { itemName?: string; price?: number; quantity?: number }): void {
  trackAction(uid, 'market_list', '经济', success ? 'success' : 'fail', detail.price ?? 0, detail);
}

/** 交易所购买事件 */
export function trackMarketBuy(uid: number, success: boolean, detail: { itemName?: string; price?: number; quantity?: number }): void {
  trackAction(uid, 'market_buy', '经济', success ? 'success' : 'fail', detail.price ?? 0, detail);
}

/** 好友变动事件 */
export function trackFriend(uid: number, action: 'friend_add' | 'friend_remove', targetId: number): void {
  trackAction(uid, action, '社交', 'success', 0, { targetId });
}

/** 道侣事件 */
export function trackCompanion(uid: number, action: string, success: boolean, detail: Record<string, unknown> = {}): void {
  trackAction(uid, action, '社交', success ? 'success' : 'fail', 0, detail);
}

/** 宗门事件 */
export function trackGuild(uid: number, action: string, success: boolean, detail: Record<string, unknown> = {}): void {
  trackAction(uid, action, '社交', success ? 'success' : 'fail', 0, detail);
}

/** 炼丹事件 */
export function trackAlchemy(
  uid: number,
  success: boolean,
  detail: { pillName?: string; quality?: string; exp?: number; isAuto?: boolean; count?: number; failedCount?: number }
): void {
  trackAction(uid, 'alchemy', '成长', success ? 'success' : 'fail', detail.exp ?? 0, detail);
}

/** 登录/活跃事件（每用户 5 分钟内只上报一次） */
const loginSeen = new Map<string, number>();
const LOGIN_DEDUP_MS = 5 * 60 * 1000;

export function trackLogin(uid: number): void {
  const now = Date.now();
  let route: ReturnType<typeof getAnalyticsConfig>;

  try {
    route = getAnalyticsConfig();
  } catch {
    return;
  }
  if (!route) {
    return;
  }
  const key = JSON.stringify([route.apiUrl, route.appid, uid]);
  const last = loginSeen.get(key) ?? 0;

  if (now - last < LOGIN_DEDUP_MS) {
    return;
  }
  loginSeen.set(key, now);

  if (loginSeen.size > 1000) {
    for (const [k, v] of loginSeen) {
      if (now - v >= LOGIN_DEDUP_MS) {
        loginSeen.delete(k);
      }
    }
  }

  trackAction(uid, 'login', '日常', 'success');
}

// ==================== 向后兼容别名 ====================

/** @deprecated 请使用 setTrackContext */
export const setActionTrackContext = setTrackContext;
