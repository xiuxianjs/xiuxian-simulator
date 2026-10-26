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
import { logger } from 'alemonjs';
import { getAppConfig } from '../utils/appConfig';
import { getBackendConfig } from '../api/bot/config';
import { classifyFeature } from './classifier';

// ==================== 公共基础设施 ====================

/** 读取分析平台配置 */
function getAnalyticsConfig(): { apiUrl: string; apiKey: string } {
  const xiuxian = getAppConfig();
  const apiUrl = String(xiuxian.analytics_api_url ?? '')
    .trim()
    .replace(/\/+$/, '');
  const gameApiUrl = getBackendConfig().url;

  return {
    apiUrl: apiUrl && apiUrl !== gameApiUrl ? apiUrl : '',
    apiKey: String(xiuxian.analytics_api_key ?? '').trim()
  };
}

/** 事件上下文（场景/频道/平台），由中间件设置，所有事件自动携带 */
export interface TrackContext {
  scene?: string; // 'private' | 'public'
  channelId?: string; // 频道/群 ID
  platform?: string; // 平台标识
}

/** 模块级上下文，中间件每次请求更新 */
let _ctx: TrackContext = {};

/** 设置当前请求的埋点上下文（由中间件调用） */
export function setTrackContext(ctx: TrackContext): void {
  _ctx = ctx;
}

function ctxScene(): string {
  return _ctx.scene ?? '';
}
function ctxChannel(): string {
  return _ctx.channelId ?? '';
}
function ctxPlatform(): string {
  return _ctx.platform ?? '';
}

// ==================== 通用批量发送器 ====================

function createBatchSender<T>(endpoint: string, bufferSize: number, flushMs: number) {
  const buffer: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (buffer.length === 0) {
      return;
    }
    const { apiUrl, apiKey } = getAnalyticsConfig();

    if (!apiUrl || !apiKey) {
      buffer.length = 0;

      return;
    }
    const batch = buffer.splice(0);

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ events: batch }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        logger.error(`[logap] ${endpoint} 上报失败: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      logger.error(`[logap] ${endpoint} 上报异常:`, error);
    }
  }

  function schedule(): void {
    if (buffer.length >= bufferSize) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      void flush();

      return;
    }
    timer ??= setTimeout(() => {
      timer = null;
      void flush();
    }, flushMs);
  }

  return {
    push(item: T) {
      buffer.push(item);
      schedule();
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

const featureSender = createBatchSender<FeaturePayload>('/api/v1/track/features', 50, 5000);

/**
 * 在埋点侧分类后入队，异步上报分析平台
 * @param _bid 平台用户 ID，保留现有调用签名
 * @param uid 用户ID
 * @param commandText 用户输入的原始文本
 * @param startTime 指令开始处理的时间戳
 * @param success 是否成功
 * @param ctx 可选上下文覆盖（不传则用模块级上下文）
 */
export function trackFeatureEvent(_bid: string, uid: number, commandText: string, startTime?: number, success = true, ctx?: TrackContext): void {
  const responseTimeMs = startTime ? Date.now() - startTime : 0;

  const timestamp = new Date().toISOString();

  try {
    const classification = classifyFeature(commandText);

    if (!classification) {
      return;
    }

    featureSender.push({
      uid,
      feature_name: classification.feature_name,
      feature_category: classification.feature_category,
      command_text: commandText.substring(0, 255),
      response_time_ms: responseTimeMs,
      success,
      scene: ctx?.scene ?? ctxScene(),
      channel_id: ctx?.channelId ?? ctxChannel(),
      platform: ctx?.platform ?? ctxPlatform(),
      timestamp
    });
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

const actionSender = createBatchSender<ActionPayload>('/api/v1/track/actions', 30, 8000);

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
    actionSender.push({
      uid,
      action,
      category,
      result,
      value,
      detail: JSON.stringify(detail),
      scene: ctxScene(),
      channel_id: ctxChannel(),
      platform: ctxPlatform(),
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
const loginSeen = new Map<number, number>();
const LOGIN_DEDUP_MS = 5 * 60 * 1000;

export function trackLogin(uid: number): void {
  const now = Date.now();
  const last = loginSeen.get(uid) ?? 0;

  if (now - last < LOGIN_DEDUP_MS) {
    return;
  }
  loginSeen.set(uid, now);

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
