import { bufferFlyMailSend } from './flymailBuffer';
import { NotificationDeliveryUncertainError } from '@src/types/notification';
import { measureTransportStage } from '@src/utils/transportTiming';
import { logger, MessageDirect, Ok, useGuild, type Events, type GuildBotState } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import { createHash } from 'crypto';
import type { NotificationChannel, NotificationTarget, PermissionState } from '@src/types/notification';
import {
  type NotificationGroupSnapshot,
  readPlatformAvailability,
  readNotificationGroupSnapshot,
  refreshNotificationGroupSnapshot,
  acquirePlatformPermissionProbe,
  compareAndSetPlatformPermission,
  readPlatformPermission,
  readPlatformPrivateTarget,
  recordPlatformPermissionEvent,
  recordPlatformPermissionFailure,
  rememberPlatformPrivateTarget
} from '@src/api/bot/notification-cache';

type NotificationContextEvent = GameEvent | Events['notice.create' | 'private.notice.create' | 'private.friend.add' | 'private.friend.remove'];

// 查询缓存/限流时间，不是游戏冷却；明确的平台权限事件持续保留。
export const PERMISSION_TTL_SECONDS = 300;
export const PERMISSION_QUERY_INTERVAL_SECONDS = 60;
export const CHANNEL_RETRY_SECONDS = 30;
const REQUEST_TIMEOUT_MS = 30_000;

export const notificationTargetKey = (target: NotificationTarget): string => createHash('sha256')
    .update(JSON.stringify([target.platform, target.BotId ?? '', target.scope, target.targetId]))
    .digest('hex');

const rawStates = new WeakMap<PermissionState, string>();

export async function withNotificationTimeout<T>(dispatch: () => Promise<T>, timeout = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      dispatch(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('通知平台请求超时')), timeout);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function assertNotificationReceipt(results: unknown): void {
  if (!Array.isArray(results) || results.length === 0 || results.some(result => result?.code !== Ok)) {
    if (!Array.isArray(results) || results.length === 0 || results.some(result => typeof result?.code !== typeof Ok || result?.code === Ok)) {
      throw new NotificationDeliveryUncertainError(`通知平台回执缺失或部分成功: ${JSON.stringify(results ?? null)?.slice(0, 2000)}`);
    }
    // QQ 错误码在 Result.data 中，保留用于诊断；undefined/空数组都不是成功回执。
    throw new Error(`通知投递失败: ${JSON.stringify(results ?? null)?.slice(0, 2000)}`);
  }
}

export async function readNotificationChannel(target: NotificationTarget): Promise<PermissionState | null> {
  const { state, raw } = await readPlatformPermission(target);

  if (state) {
    rawStates.set(state, raw);
  }

  return state;
}

// 查询/发送进行期间收到的平台权限事件优先；旧请求不能覆盖新事件。
async function compareAndSetState(target: NotificationTarget, previous: string | null, value: PermissionState, ttl: number): Promise<void> {
  await compareAndSetPlatformPermission(target, previous ?? '', value, ttl);
}

const groupSnapshots = new Map<string, { data: GuildBotState; updatedAt: number }>();

const probes = new Map<string, Promise<PermissionState | null>>();

async function queryNotificationPermission(target: NotificationTarget): Promise<PermissionState['state']> {
  const key = notificationTargetKey(target);
  let state: PermissionState['state'] = 'unknown';

  try {
    const [guild] = useGuild({ Platform: target.platform, BotId: target.BotId, Target: target });
    const result = await withNotificationTimeout(() => guild.botInfo(), 10_000);

    if (result.code === Ok && result.data) {
      // 有限本地展示缓存；进程未观测到的字段明确显示未知。
      if (groupSnapshots.size >= 1000) {
        const oldest = groupSnapshots.keys().next().value;

        if (oldest) {
          groupSnapshots.delete(oldest);
        }
      }
      groupSnapshots.set(key, { data: result.data, updatedAt: Date.now() });
    }
    if (result.code === Ok && typeof result.data?.allowsProactiveMessages === 'boolean') {
      state = result.data.allowsProactiveMessages ? 'allowed' : 'blocked';
    } else {
      logger.warn('通知群权限无法确认', { target, result });
    }
  } catch (error) {
    logger.warn('通知群权限查询失败', { target, error });
  }

  return state;
}

export async function refreshNotificationPermission(target: NotificationTarget): Promise<PermissionState | null> {
  if (target.platform !== 'qq-bot' || target.scope !== 'group') {
    return await readNotificationChannel(target);
  }
  const key = notificationTargetKey(target);
  const existing = probes.get(key);

  if (existing) {
    return await existing;
  }
  const probe = async () => {
    // Go 原子快照旧值并获取跨进程查询冷却，权限事件仍可抢先写入。
    const { previous, acquired } = await acquirePlatformPermissionProbe(target);

    if (!acquired) {
      return await readNotificationChannel(target);
    }
    const state = await queryNotificationPermission(target);

    await compareAndSetState(target, previous, { state, source: 'query', updatedAt: Date.now() }, state === 'unknown' ? 60 : PERMISSION_TTL_SECONDS);

    return await readNotificationChannel(target);
  };
  const pending = probe();

  probes.set(key, pending);
  try {
    return await pending;
  } finally {
    probes.delete(key);
  }
}

export const notificationChannel: NotificationChannel = {
  async read(target) {
    const availability = await readPlatformAvailability(target);

    if (availability?.available === false) {
      return { state: 'blocked', source: 'event', updatedAt: availability.updatedAt };
    }

    return await readNotificationChannel(target);
  },
  async refreshAfterFailure(target) {
    const availability = await readPlatformAvailability(target);

    if (availability?.available === false) {
      return { state: 'blocked', source: 'event', updatedAt: availability.updatedAt };
    }

    return await refreshNotificationPermission(target);
  },
  async recordFailure(target) {
    await recordPlatformPermissionFailure(target);
  },
  async send(target, data, previous) {
    return await bufferFlyMailSend(target, data, content => sendNotificationNow(target, content, previous));
  }
};

async function sendNotificationNow(
  target: NotificationTarget,
  data: Parameters<NotificationChannel['send']>[1],
  previous: PermissionState | null
): Promise<void> {
  if (process.env.login && process.env.login !== target.platform) {
    throw new Error(`通知目标平台与当前适配器不一致: ${target.platform}`);
  }
  // 状态检查后发生关闭/删除时，发送前再核实，避免继续使用旧快照。
  const current = await notificationChannel.read(target);

  if (current?.state === 'blocked') {
    throw new Error('通知通道已关闭或失效');
  }
  const direct = MessageDirect.create();
  const result = await measureTransportStage('notification.platform.send', () => withNotificationTimeout(() => {
      if (target.platform === 'qq-bot') {
        return direct.sendToTarget({ target, format: data });
      }
      if (target.platform === 'onebot') {
        return target.scope === 'group'
          ? direct.sendToChannel({ SpaceId: target.targetId, BotId: target.BotId, format: data })
          : direct.sendToUser({ OpenID: target.targetId, BotId: target.BotId, format: data });
      }
      throw new Error(`不支持的通知平台: ${target.platform}`);
    })
  ).catch(error => {
    throw new NotificationDeliveryUncertainError('通知平台发送结果不确定', { cause: error });
  });

  assertNotificationReceipt(result);
  // 平台已确认发送成功，缓存写入失败不应把已发送事件变为失败重发。
  await compareAndSetState(
    target,
    previous ? (rawStates.get(previous) ?? JSON.stringify(previous)) : null,
    { state: 'allowed', source: 'receipt', updatedAt: Date.now() },
    PERMISSION_TTL_SECONDS
  ).catch(error => logger.error('通知成功状态缓存失败', error));
}

/** 保存真正出现过的私聊地址，避免将 QQ member_openid 当作 user_openid。 */
export async function rememberNotificationTarget(event: NotificationContextEvent): Promise<void> {
  const target = event.Target;
  const platform = String(event.Platform);
  const botId = target?.BotId ?? event.BotId;
  const isPrivate = event.IsPrivate ?? ('isPrivate' in event && event.isPrivate);
  let privateTarget: NotificationTarget | undefined;

  if (target && ['c2c', 'direct'].includes(target.scope)) {
    privateTarget = { ...target, platform, BotId: botId };
  } else if ('DirectUserId' in event && event.DirectUserId) {
    privateTarget = { platform, BotId: botId, scope: 'c2c', targetId: String(event.DirectUserId) };
  } else if (isPrivate && 'UserId' in event && event.UserId && platform === 'onebot') {
    privateTarget = { platform, BotId: botId, scope: 'c2c', targetId: event.UserId };
  }
  if (privateTarget && 'UserId' in event && event.UserId) {
    await rememberPlatformPrivateTarget(platform, event.UserId, privateTarget);
  }
}

export async function getNotificationPrivateTarget(platform: string, bid: string, botId?: string): Promise<NotificationTarget | null> {
  return await readPlatformPrivateTarget(platform, bid, botId);
}

export async function handleNotificationPermissionEvent(event: NotificationContextEvent): Promise<void> {
  if (event.Platform !== 'qq-bot' || event.Notice?.type !== 'message-permission' || !event.Target) {
    return;
  }
  const target: NotificationTarget = { ...event.Target, platform: event.Platform, BotId: event.Target.BotId ?? event.BotId };

  const occurredAt = event.OccurredAt;
  const observedOnly = !Number.isSafeInteger(occurredAt) || (occurredAt ?? 0) <= 0;

  await recordPlatformPermissionEvent(target, event.Notice.enabled, observedOnly ? Date.now() : occurredAt!, observedOnly);
  await rememberNotificationTarget(event);
}

export async function describeNotificationGroup(target: NotificationTarget, memberId: string, supplied?: NotificationGroupSnapshot | null): Promise<string[]> {
  if (target.platform !== 'qq-bot' || target.scope !== 'group') {
    return [];
  }
  let overview =
    supplied === undefined
      ? await readNotificationGroupSnapshot(target, memberId, true)
      : (supplied ?? { permission: null, availability: null, member: null, previous: '', acquired: false });

  if (supplied === undefined && overview.acquired) {
    const state = await queryNotificationPermission(target);

    overview = await refreshNotificationGroupSnapshot(
      target,
      memberId,
      overview.previous,
      { state, source: 'query', updatedAt: Date.now() },
      state === 'unknown' ? 60 : PERMISSION_TTL_SECONDS
    );
  }
  const { permission, availability, member } = overview;
  const snapshot = groupSnapshots.get(notificationTargetKey(target));
  const data = snapshot && Date.now() - snapshot.updatedAt < PERMISSION_TTL_SECONDS * 1000 ? snapshot.data : undefined;
  const modes: Record<string, string> = { all: '全部消息', only_mention: '仅接收 @ 机器人的消息', mention_and_context: '@ 及相关上下文消息' };
  const roles: Record<string, string> = { admin: '管理员', owner: '群主', member: '普通成员' };
  const lines = [
    `群主动推送：${permission?.state === 'allowed' ? '已允许（最近状态）' : permission?.state === 'blocked' ? '已关闭' : '暂时无法确认'}`,
    `消息接收模式：${modes[data?.receiveMode ?? ''] ?? '暂时无法确认'}`,
    `机器人角色：${roles[data?.role ?? ''] ?? '暂时无法确认'}`
  ];

  if (availability?.available === false) {
    lines.push('机器人已离开该群，群投递暂停。');
  }
  if (member?.available === false) {
    lines.push('已记录你离开该群，原群投递暂停。');
  }
  if (data?.receiveMode === 'only_mention' || data?.receiveMode === 'mention_and_context') {
    lines.push('发送指令前请先 @ 机器人。');
  }

  return lines;
}
