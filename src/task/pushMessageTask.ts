import { playerNotificationEnabled } from '@src/api/bot/notification-cache';
import { getBackendConfig } from '@src/api/bot/config';
import { withFlyMailBuffer } from '@src/notification/flymailBuffer';
import type { NotificationRelayEvent } from '@src/api/bot/notification-relay';
import { flyMailNoticeData } from '@src/utils/flyMailPresentation';
import { deliverFlyMailNotification } from '@src/notification/flymailDelivery';
import { getAppConfig } from '@src/utils/appConfig';
import {
  acknowledgeNotificationRelay,
  archiveNotificationRelay,
  claimNotificationRelay,
  getLegacySentNotificationIDs,
  markLegacyNotificationSent,
  retryNotificationRelay
} from '@src/api/bot/notification-relay';
import { deliverLegacyNotification, deliverPlayerNotification, deliverNotificationOnce } from '@src/notification/service';
import { notificationNoticeData } from '@src/notification/presentation';
import { logger, type DataEnums } from 'alemonjs';
import { randomUUID } from 'crypto';

type RelayPayload = { messageId?: string; cid?: string; uid?: string; subscriptionUserId?: number; data?: unknown };
type PlayerNotificationPayload = {
  blackBoxOptIn?: boolean;
  historyOnly?: boolean;
  source?: string;
  flymail?: unknown;
  version: 1;
  recipientUserId: number;
  data: DataEnums[];
};

const parsePayload = (raw: unknown): Record<string, unknown> | null => {
  try {
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
};

const proactiveEnabled = () => !getAppConfig()?.close_proactive_message;

/** 服务端登记的平台账号归属；仅用于兼容尚未下发归属的旧服务端。 */
const runtimeOwnerByBid = new Map<string, number>();

/**
 * 通知所属用户以服务端下发的归属为准（recipientUserId/recipientBid）。
 * payloadUserId 只作为旧服务端的兼容回退；两边都给出却不一致时不能猜，交给重试。
 */
function resolveNotificationOwner(row: { recipientUserId?: number; recipientBid?: string }, bid: string, payloadUserId?: number): number {
  const declared = row.recipientUserId;
  const payloadOwner = Number.isSafeInteger(payloadUserId) && (payloadUserId as number) > 0 ? (payloadUserId as number) : undefined;

  if (!Number.isSafeInteger(declared) || (declared as number) <= 0) {
    if (payloadOwner !== undefined) {
      return payloadOwner;
    }
    const known = runtimeOwnerByBid.get(bid);

    if (known !== undefined) {
      return known;
    }
    throw new Error(`通知缺少所属用户: ${bid}`);
  }
  const owner = declared as number;

  if (payloadOwner !== undefined && payloadOwner !== owner) {
    throw new Error(`通知归属与载荷玩家不一致: ${owner} != ${payloadOwner}`);
  }
  if (row.recipientBid && row.recipientBid !== bid) {
    throw new Error(`通知归属平台账号不一致: ${row.recipientBid} != ${bid}`);
  }
  runtimeOwnerByBid.set(bid, owner);

  return owner;
}

/** 一次只认领即将处理的事件，避免慢请求使整批事件的租约提前过期。 */
type LoadLegacyIDs = () => Promise<Set<string>>;

async function dispatchPlayerNotifications(loadLegacyIDs: LoadLegacyIDs, lane: 'flymail' | 'standard'): Promise<void> {
  const consumer = `node.${lane}.player-notification:${randomUUID()}`;

  while (true) {
    const row = await claimNotificationRelay('player.notification.dispatch', consumer, lane);

    if (!row) {
      break;
    }
    await processPlayerNotification(row, consumer, loadLegacyIDs, lane);
  }
}

async function processPlayerNotification(
  row: NotificationRelayEvent,
  consumer: string,
  loadLegacyIDs: LoadLegacyIDs,
  lane: 'flymail' | 'standard'
): Promise<void> {
  try {
    // 飞信使用独立事件 ID 和回执，不等待旧消息池的去重快照。
    const mids = lane === 'flymail' ? new Set<string>() : await loadLegacyIDs();

    if (mids.has(row.eventId)) {
      await acknowledgeNotificationRelay(row.eventId, consumer, { route: 'history', reason: 'no_target' });

      return;
    }
    const payload = parsePayload(row.payload) as PlayerNotificationPayload | null;

    if (payload?.version !== 1 || !Number.isSafeInteger(payload.recipientUserId) || payload.recipientUserId <= 0 || !Array.isArray(payload.data)) {
      throw new Error('玩家通知事件载荷无效');
    }
    // 下架期间关闭主动通知，原投递逻辑完整保留，恢复时移除此拦截。
    if (payload.source?.startsWith('black-box.') || payload.source?.startsWith('guild.competition.')) {
      await acknowledgeNotificationRelay(row.eventId, consumer, { route: 'history', reason: 'proactive_disabled' });

      return;
    }
    const blackBoxNotice = payload.source?.startsWith('black-box.') === true;

    if (!row.recipientBid && !blackBoxNotice && payload.source !== 'flymail.subscription.required' && payload.source !== 'flymail.message.received') {
      throw new Error(`通知接收玩家未绑定平台账号: ${payload.recipientUserId}`);
    }
    // 归属必须与服务端下发的一致，订阅查询与私聊地址都按该玩家进行。
    const ownerUserId = resolveNotificationOwner(row, row.recipientBid ?? '', payload.recipientUserId);
    const data =
      payload.source === 'flymail.message.received'
        ? (flyMailNoticeData(payload.flymail, ownerUserId) ?? notificationNoticeData(payload.data, payload.source))
        : notificationNoticeData(payload.data, payload.source);
    const delivery = await deliverNotificationOnce(row.eventId, async () => {
      // Only explicit per-session subscriptions may initiate a DM.
      // Old queued announcements and events without consent stay in history.
      if (
        blackBoxNotice &&
        (payload.blackBoxOptIn !== true ||
          !['black-box.reminder', 'black-box.opening', 'black-box.started', 'black-box.result', 'black-box.admission'].includes(payload.source!))
      ) {
        return { route: 'history' as const, reason: 'proactive_disabled' as const };
      }
      if (!(await playerNotificationEnabled(ownerUserId, payload.source))) {
        return { route: 'history' as const, reason: 'proactive_disabled' as const };
      }
      if (blackBoxNotice && !row.recipientBid) {
        return Promise.resolve({ route: 'history' as const, reason: 'no_target' as const });
      }
      if (payload.source === 'flymail.subscription.required') {
        // 旧管理员告警可能带有正文，只保留历史，不再向其他人转发。
        return Promise.resolve({ route: 'history' as const, reason: 'no_target' as const });
      }
      if (payload.source === 'flymail.message.received') {
        return deliverFlyMailNotification(row.eventId, row.recipientBid ?? '', data, proactiveEnabled());
      }

      return deliverPlayerNotification(ownerUserId, row.recipientBid!, data, proactiveEnabled(), blackBoxNotice ? { privateOnly: true } : undefined);
    });

    // 只有明确成功或已经决定仅保留站内记录才确认；未知回执继续重试。
    await acknowledgeNotificationRelay(row.eventId, consumer, delivery);
    logger.info('玩家通知处理完成', { eventId: row.eventId, userId: ownerUserId, ...delivery });
  } catch (error) {
    await retryNotificationRelay(row.eventId, consumer, error);
    logger.error(`玩家通知处理失败: ${row.eventId}`, error);
  }
}

async function dispatchWorkerMessages(loadLegacyIDs: LoadLegacyIDs): Promise<void> {
  const consumer = `node.platform-message:${randomUUID()}`;

  while (true) {
    const row = await claimNotificationRelay('platform.message.dispatch', consumer);

    if (!row) {
      break;
    }
    const payload = parsePayload(row.payload) as RelayPayload | null;
    const messageId = String(payload?.messageId ?? '');

    try {
      const mids = await loadLegacyIDs();

      if (messageId && mids.has(messageId)) {
        await acknowledgeNotificationRelay(row.eventId, consumer, { route: 'history', reason: 'no_target' });
        continue;
      }
      if (!payload || (!payload.cid && !payload.uid)) {
        throw new Error('主动消息缺少接收方');
      }
      const data = (typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data) as DataEnums[];

      if (!Array.isArray(data)) {
        throw new Error('主动消息内容无效');
      }
      // 服务端认定的所属玩家（recipientUserId/recipientBid）优先；
      // 旧消息池载荷里的 subscriptionUserId 只在服务端未下发归属时兜底。
      const ownerUserId = payload.uid ? resolveNotificationOwner(row, payload.uid, payload.subscriptionUserId) : undefined;

      // 定向消息先归档，发送后写库失败不会因归档而触发重复投递。
      if (payload.uid) {
        await archiveNotificationRelay(payload.uid, `platform.message:${messageId || row.eventId}`, data);
      }
      const notice = notificationNoticeData(data);
      const delivery = await deliverNotificationOnce(`platform:${messageId || row.eventId}`, async () => {
        if (ownerUserId !== undefined && !(await playerNotificationEnabled(ownerUserId))) {
          return { route: 'history' as const, reason: 'proactive_disabled' as const };
        }
        if (ownerUserId !== undefined && payload.uid) {
          return deliverPlayerNotification(
            ownerUserId,
            payload.uid,
            notice.filter(block => block.type !== 'Mention'),
            proactiveEnabled()
          );
        }

        return deliverLegacyNotification({ ...payload, data: notice }, proactiveEnabled());
      });

      await acknowledgeNotificationRelay(row.eventId, consumer, delivery);
      if (messageId) {
        await markLegacyNotificationSent(messageId);
        mids.add(messageId);
      }
    } catch (error) {
      await retryNotificationRelay(row.eventId, consumer, error);
      logger.error(`Worker 主动消息处理失败: ${row.eventId}`, error);
    }
  }
}

let running = false;
let pending = false;

export const dispatchStandardMessages = async (): Promise<void> => {
  pending = true;
  if (running) {
    return;
  }
  running = true;
  try {
    while (pending) {
      pending = false;
      // One fresh history snapshot per drain; empty queues never load it.
      let legacyIDs: Promise<Set<string>> | undefined;
      const loadLegacyIDs: LoadLegacyIDs = () => (legacyIDs ??= getLegacySentNotificationIDs());

      if (!getBackendConfig().channelMode) {
        await dispatchWorkerMessages(loadLegacyIDs);
      }
      await dispatchPlayerNotifications(loadLegacyIDs, 'standard');
    }
  } catch (error) {
    logger.error('通知推送任务失败', error);
    throw error;
  } finally {
    running = false;
  }
};

// 有界并发让同对象消息进入同一个缓冲窗口；更多消息留在服务端。
const FLYMAIL_IN_FLIGHT_LIMIT = 32;
let flyMailRunning = false;
let wakeFlyMail: (() => void) | undefined;

export const PushFlyMailTask = async (): Promise<void> => {
  wakeFlyMail?.();
  if (flyMailRunning) {
    return;
  }
  flyMailRunning = true;
  const consumer = `node.flymail.player-notification:${randomUUID()}`;
  const active = new Set<Promise<void>>();
  const emptyLegacyIDs = () => Promise.resolve(new Set<string>());

  try {
    while (true) {
      let wake!: () => void;
      let notified = false;
      const signal = new Promise<void>(resolve => {
        wake = () => {
          notified = true;
          resolve();
        };
      });

      wakeFlyMail = wake;
      if (active.size >= FLYMAIL_IN_FLIGHT_LIMIT) {
        await Promise.race(active);
        continue;
      }
      const row = await claimNotificationRelay('player.notification.dispatch', consumer, 'flymail');

      if (!row) {
        if (!active.size) {
          if (notified) {
            continue;
          }
          break;
        }
        await Promise.race([...active, signal]);
        continue;
      }
      const delivery = withFlyMailBuffer(() => processPlayerNotification(row, consumer, emptyLegacyIDs, 'flymail'));

      active.add(delivery);
      void delivery.then(
        () => {
          active.delete(delivery);
        },
        () => {}
      );
    }
  } finally {
    wakeFlyMail = undefined;
    // 即使认领 API 中断，也先等已认领事件落回执，避免另一轮重复处理。
    await Promise.allSettled(active);
    flyMailRunning = false;
  }
};

export const PushMessageTask = async (): Promise<void> => {
  await Promise.all([PushFlyMailTask(), dispatchStandardMessages()]);
};
