import { logger, Ok, useGuild, useMember, type Events } from 'alemonjs';
import type { GameEvent } from '@src/types/event';
import type { NotificationTarget } from '@src/types/notification';
import { queueCommunityNotification, recordCommunityJoinRequest } from '@src/api/bot/notification-cache';
import { withNotificationTimeout } from './channel';

export function communityTarget(event: Pick<GameEvent, 'Platform' | 'BotId' | 'Target'>): NotificationTarget {
  const target = event.Target;

  if (event.Platform !== 'qq-bot' || target?.scope !== 'group' || !(target.BotId ?? event.BotId) || !target.targetId) {
    throw new Error('请在 QQ 群内使用此功能。');
  }

  return { ...target, platform: event.Platform, BotId: target.BotId ?? event.BotId };
}

/** 配置由当前群管理员决定，不能用机器人主人或游戏角色权限替代。 */
export async function requireCommunityAdministrator(event: GameEvent): Promise<NotificationTarget> {
  const target = communityTarget(event);

  // QQ 消息事件已携带当前发送人在本群的角色，不依赖额外成员查询权限。
  if (event.Role === 'admin' || event.Role === 'owner') {
    return target;
  }
  if (event.Role === 'member') {
    throw new Error('仅本群管理员或群主可操作。');
  }
  const [member] = useMember({ Platform: event.Platform, BotId: target.BotId, Target: target });
  const result = await withNotificationTimeout(() => member.info({ userId: event.UserId }), 10_000);

  if (result.code !== Ok || !result.data?.Role) {
    logger.warn('群管理员身份查询失败', { code: result.code, message: result.message });
    throw new Error('暂时无法查询你的群身份，请稍后重试；这不代表你不是管理员。');
  }
  if (!['admin', 'owner'].includes(result.data.Role)) {
    throw new Error('仅本群管理员或群主可操作。');
  }

  return target;
}

export async function requireCommunityBotAdministrator(target: NotificationTarget): Promise<void> {
  const [guild] = useGuild({ Platform: target.platform, BotId: target.BotId, Target: target });
  const result = await withNotificationTimeout(() => guild.botInfo(), 10_000);

  if (result.code !== Ok || !['admin', 'owner'].includes(result.data?.role ?? '')) {
    throw new Error('机器人需具备本群管理权限；当前权限无法确认时不执行。');
  }
}

export async function handleCommunityJoinRequest(event: Events['notice.create' | 'private.notice.create']): Promise<void> {
  if (event.Platform !== 'qq-bot' || event.Notice?.type !== 'join-request') {
    return;
  }
  const target = communityTarget(event);
  const request = event.Notice.request;

  if (request.guildId !== target.targetId) {
    throw new Error('加群申请目标与事件群不一致');
  }
  await recordCommunityJoinRequest(target, {
    id: request.id,
    userId: request.userId,
    userName: request.userName ?? '',
    appliedAt: request.appliedAt ?? '',
    autoApproved: Boolean(request.approvedByStrategyId),
    observedAt: event.OccurredAt ?? Date.now()
  });
  if (!request.approvedByStrategyId) {
    await queueCommunityNotification(target, 'request', request.id, event.OccurredAt ?? Date.now());
  }
}
