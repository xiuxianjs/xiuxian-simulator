import { logger, type DataEnums } from 'alemonjs';
import {
  getNotificationSubscriptionTarget,
  recordNotificationSubscriptionDelivery,
  type NotificationSubscriptionTarget
} from '@src/api/bot/notification-relay';
import { readPlatformAvailability } from '@src/api/bot/notification-cache';
import type { NotificationTarget, NotificationDelivery } from '@src/types/notification';
import { deliverNotification, legacyNotificationTarget } from './delivery';
import { getNotificationPrivateTarget, notificationChannel, refreshNotificationPermission } from './channel';
import { notificationDeliveryReceipt } from './deliveryReceipt';

const subscriptionTarget = (subscription: NotificationSubscriptionTarget): NotificationTarget => ({
  platform: subscription.platform,
  scope: subscription.targetScope,
  targetId: subscription.channelId,
  BotId: subscription.botId ?? undefined
});

/** 成功后数据库 ack 失败时复用回执。7 天覆盖常规重试窗口，不是玩家历史的保留期限。 */
export async function deliverNotificationOnce(eventId: string, send: () => Promise<NotificationDelivery>): Promise<NotificationDelivery> {
  const receipt = notificationDeliveryReceipt(eventId);
  const cached = await receipt.read();

  if (cached) {
    return cached;
  }
  const delivery = await send();

  await receipt.save(delivery).catch(error => logger.error('通知回执缓存失败，继续确认数据库事件', error));

  return delivery;
}

export async function deliverPlayerNotification(
  userId: number,
  bid: string,
  data: DataEnums[],
  enabled: boolean,
  options?: {
    privateOnly?: boolean;
    fallbackOnFailure?: boolean;
    sendGroup?: (target: NotificationTarget, send: (content?: DataEnums[]) => Promise<void>) => Promise<void>;
  }
) {
  const subscription = enabled && !options?.privateOnly ? await getNotificationSubscriptionTarget(userId) : null;
  const group = subscription?.isEnabled ? subscriptionTarget(subscription) : null;
  const platform = subscription?.platform ?? process.env.login ?? '';
  const botId = subscription?.botId ?? undefined;
  const isGroup = (target: NotificationTarget) => target.scope === 'group' || target.scope === 'channel';
  // 订阅群是唯一的群投放点：玩家在其他群最近发过言不能成为投递理由，
  // 否则「传讯约定 · 群通知订阅」形同虚设，通知会出现在没订阅的群。
  // 订阅群不可达时按既有顺序回退私聊，再落到 /我的通知 站内记录。
  const privateTarget = async () => {
    const candidate = (await getNotificationPrivateTarget(platform, bid, botId)) ?? legacyNotificationTarget(bid, 'private', platform, botId);

    return options?.privateOnly && candidate && !['c2c', 'direct'].includes(candidate.scope) ? null : candidate;
  };

  return await deliverNotification(
    { group, privateTarget, data, mention: bid, enabled, fallbackOnFailure: options?.fallbackOnFailure },
    {
      ...notificationChannel,
      async read(target) {
        if (isGroup(target)) {
          const member = await readPlatformAvailability(target, bid);

          if (member?.available === false) {
            return { state: 'blocked', source: 'event', updatedAt: member.updatedAt };
          }
        }

        const state = await notificationChannel.read(target);

        return isGroup(target) && (!state || state.state === 'unknown') ? await refreshNotificationPermission(target) : state;
      },
      async refreshAfterFailure(target) {
        if (isGroup(target)) {
          const member = await readPlatformAvailability(target, bid);

          if (member?.available === false) {
            return { state: 'blocked', source: 'event', updatedAt: member.updatedAt };
          }
        }

        return await notificationChannel.refreshAfterFailure(target);
      },
      async send(target, content, previous) {
        try {
          if (isGroup(target) && (await readPlatformAvailability(target, bid))?.available === false) {
            throw new Error('已记录成员离开原群，暂停原群投递');
          }
          if (isGroup(target) && options?.sendGroup) {
            await options.sendGroup(target, replacement => notificationChannel.send(target, replacement ?? content, previous));
          } else {
            await notificationChannel.send(target, content, previous);
          }
        } catch (error) {
          if (target === group && subscription) {
            await recordNotificationSubscriptionDelivery(userId, subscription, error instanceof Error ? error.message : String(error)).catch(err => logger.error('记录通知失败信息失败', err)
            );
          }
          throw error;
        }
        if (target === group && subscription) {
          await recordNotificationSubscriptionDelivery(userId, subscription).catch(error => logger.error('记录通知成功信息失败', error));
        }
      }
    }
  );
}

/** Worker 与旧 Redis 消息也经过同一权限/回执处理，保留原有事件格式。 */
export async function deliverLegacyNotification(input: { cid?: string; uid?: string; data: DataEnums[] }, enabled: boolean) {
  const platform = process.env.login ?? '';
  const group = input.cid ? legacyNotificationTarget(input.cid, 'group', platform) : null;
  const recipientBid = input.uid;
  const privateTarget = recipientBid
    ? async () => (await getNotificationPrivateTarget(platform, recipientBid)) ?? legacyNotificationTarget(recipientBid, 'private', platform)
    : null;

  return await deliverNotification(
    { group, privateTarget, recipientBid, data: input.data, enabled },
    {
      ...notificationChannel,
      send: (target, data, previous) => notificationChannel.send(target, target === group ? data : data.filter(block => block.type !== 'Mention'), previous)
    }
  );
}
