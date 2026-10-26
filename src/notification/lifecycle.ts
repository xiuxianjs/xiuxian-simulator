import { logger, type Events } from 'alemonjs';
import { recordPlatformAvailability } from '@src/api/bot/notification-cache';
import { rememberNotificationTarget } from './channel';
import type { NotificationTarget } from '@src/types/notification';

export const lifecycleEvents = ['private.friend.add', 'private.friend.remove', 'guild.join', 'guild.exit', 'member.add', 'member.remove'] as const;
export type LifecycleEvent = Events[(typeof lifecycleEvents)[number]];

/** 平台生命周期仅改变对应通道，不触碰玩家存档或订阅意愿。 */
export async function handleNotificationLifecycle(event: LifecycleEvent): Promise<boolean> {
  if (!lifecycleEvents.includes(event.name) || event.Platform !== 'qq-bot') {
    return false;
  }
  const raw = event.value && typeof event.value === 'object' ? (event.value as Record<string, unknown>) : {};
  const firstID = (...values: unknown[]): string => values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? '';
  const botId = event.Target?.BotId ?? event.BotId;
  const privateEvent = event.name.startsWith('private.friend.');
  const memberEvent = event.name.startsWith('member.');
  // 退群事件必须使用退出成员，不回退到操作人。
  const memberId = memberEvent ? firstID(event.MemberId, raw.member_openid) : '';
  const privateId = firstID(event.UserId, raw.openid, raw.user_openid);
  const groupId = firstID(event.ChannelId, event.GuildId, raw.group_openid);
  const target: NotificationTarget | undefined = event.Target
    ? { ...event.Target, platform: event.Platform, BotId: botId }
    : privateEvent && privateId
      ? { platform: event.Platform, BotId: botId, scope: 'c2c', targetId: privateId }
      : groupId
        ? { platform: event.Platform, BotId: botId, scope: 'group', targetId: groupId }
        : undefined;

  const expectedScope = privateEvent ? 'c2c' : 'group';

  if (!target?.targetId || target.scope !== expectedScope || !botId || (memberEvent && !memberId)) {
    logger.warn('跳过字段不完整的平台生命周期事件', {
      event: event.name,
      missingBot: !botId,
      missingTarget: !target?.targetId,
      invalidScope: !!target && target.scope !== expectedScope,
      missingMember: memberEvent && !memberId
    });

    return false;
  }
  const available = event.name.endsWith('.add') || event.name === 'guild.join';
  const occurredAt = event.OccurredAt;
  const observedOnly = !Number.isSafeInteger(occurredAt) || (occurredAt ?? 0) <= 0;

  await recordPlatformAvailability(target, available, observedOnly ? Date.now() : occurredAt!, memberId ?? '', observedOnly);
  // 后续欢迎沿用已验证的真实目标；不推导跨范围标识。
  event.Target = target;
  event.BotId = botId;
  if (memberEvent) {
    event.MemberId = memberId;
  }
  if (event.name === 'private.friend.add') {
    // 保留具体 Target，避免把群成员 ID 当成私聊地址。
    await rememberNotificationTarget({ ...event, Target: target });
  }

  return true;
}
