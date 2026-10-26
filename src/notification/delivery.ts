import { Format, type DataEnums } from 'alemonjs';
import { NotificationDeliveryUncertainError, NotificationDeliveryPendingError } from '@src/types/notification';
import { filterFeatureFormat, presentationCommandFilter } from '@src/utils/featureVisibility';
import { FormatGui } from '@src/utils/messageHelper';
import type { NotificationChannel, NotificationDelivery, NotificationTarget } from '@src/types/notification';

export type { NotificationChannel, NotificationDelivery, NotificationTarget, PermissionState } from '@src/types/notification';

/** 订阅是玩家意愿，权限是通道状态；任何投递失败都不改变玩家订阅。 */
export async function deliverNotification(
  input: {
    group?: NotificationTarget | null;
    fallbackGroups?: () => Promise<NotificationTarget[]>;
    privateTarget?: NotificationTarget | null;
    data: DataEnums[];
    mention?: string;
    recipientBid?: string;
    enabled: boolean;
    /** 飞信明确发送失败时继续尝试私聊；私聊也失败则只留站内记录。 */
    fallbackOnFailure?: boolean;
  },
  channel: NotificationChannel,
  now = Date.now
): Promise<NotificationDelivery> {
  if (!input.enabled) {
    return { route: 'history', reason: 'proactive_disabled' };
  }

  const recipientBid = input.recipientBid ?? input.mention;
  const allowed = await presentationCommandFilter(recipientBid ? { UserId: recipientBid } : undefined);
  const filterData = (data: DataEnums[]) => {
    const format = Format.create();

    format.value.push(...data);

    return filterFeatureFormat(format, allowed).value;
  };
  const tryTarget = async (target: NotificationTarget, data: DataEnums[]): Promise<boolean> => {
    const cached = await channel.read(target);

    if (cached?.state === 'blocked') {
      return false;
    }
    if (cached?.retryAt && cached.retryAt > now()) {
      if (input.fallbackOnFailure) {
        return false;
      }
      throw new Error('通知通道暂时冷却，等待重试');
    }
    try {
      await channel.send(target, filterData(data), cached);

      return true;
    } catch (error) {
      if (error instanceof NotificationDeliveryPendingError) {
        throw error;
      }
      if (error instanceof NotificationDeliveryUncertainError) {
        await channel.recordFailure(target);
        throw error;
      }
      // 仅在真实发送失败后刷新群状态。查询失败/不支持不能视为无权限。
      const state = await channel.refreshAfterFailure(target);

      if (state?.state === 'blocked') {
        return false;
      }
      await channel.recordFailure(target);
      if (input.fallbackOnFailure) {
        return false;
      }
      throw error;
    }
  };

  const seen = new Set<string>();
  const tryGroup = async (target: NotificationTarget) => {
    const key = JSON.stringify([target.platform, target.BotId ?? '', target.scope, target.targetId]);

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    const data = input.mention ? FormatGui({ bid: input.mention, content: input.data, bar: false }).format.value : input.data;

    return await tryTarget(target, data);
  };

  if (input.group && (await tryGroup(input.group))) {
    return { route: 'group', reason: 'sent' };
  }
  for (const target of (await input.fallbackGroups?.()) ?? []) {
    if (await tryGroup(target)) {
      return { route: 'group', reason: 'sent' };
    }
  }
  if (input.privateTarget) {
    const data = input.mention ? FormatGui({ isPrivate: true, bid: input.mention, content: input.data, bar: false }).format.value : input.data;

    if (await tryTarget(input.privateTarget, data)) {
      return { route: 'private', reason: 'sent' };
    }

    return { route: 'history', reason: 'permission_blocked' };
  }

  return { route: 'history', reason: seen.size > 0 ? 'permission_blocked' : 'no_private_target' };
}

/** 仅显式带范围的旧标识可转换，QQ 群成员 ID 不推断为 C2C ID。 */
export function legacyNotificationTarget(id: string, kind: 'group' | 'private', platform: string, botId?: string): NotificationTarget | null {
  const match = id.match(/^(GROUP|GUILD|C2C|DIRECT):(.+)$/);
  const scopes = { GROUP: 'group', GUILD: 'channel', C2C: 'c2c', DIRECT: 'direct' } as const;

  if (match) {
    return { platform, scope: scopes[match[1] as keyof typeof scopes], targetId: match[2], BotId: botId };
  }
  if (!id || !['qq-bot', 'onebot'].includes(platform)) {
    return null;
  }
  if (platform === 'qq-bot' && kind === 'private') {
    return null;
  }

  return { platform, scope: kind === 'group' ? 'group' : 'c2c', targetId: id, BotId: botId };
}
