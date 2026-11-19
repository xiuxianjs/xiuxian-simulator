import { notificationSettingsData } from './presentation';
import { Format, type DataEnums } from 'alemonjs';
import { acquireFlyMailGroupReminder } from '@src/api/bot/notification-cache';
import { getNotificationSubscriptionTarget } from '@src/api/bot/notification-relay';
import { type NotificationDelivery, type NotificationTarget } from '@src/types/notification';
import { notificationChannel, getNotificationPrivateTarget } from './channel';
import { deliverNotification, legacyNotificationTarget } from './delivery';
import { withFlyMailGroupReminder } from './flymailBuffer';
import { deliverNotificationOnce } from './service';

/** 所有飞信仅向收件人私聊发送正文；群内仅发送不含会话信息的提醒。 */
export async function deliverFlyMailNotification(
  eventId: string,
  bid: string,
  data: DataEnums[],
  enabled: boolean,
  /** 服务端下发的通知所属玩家；订阅群按该玩家查询。 */
  ownerUserId?: number
): Promise<NotificationDelivery> {
  if (!enabled) {
    return { route: 'history', reason: 'proactive_disabled' };
  }
  if (!bid) {
    return { route: 'history', reason: 'no_target' };
  }
  const platform = process.env.login ?? '';
  const privateDelivery = await deliverNotificationOnce(`${eventId}:private`, async () => {
    const candidate = (await getNotificationPrivateTarget(platform, bid)) ?? legacyNotificationTarget(bid, 'private', platform);
    // 私聊地址必须有明确私聊范围，旧 GROUP/GUILD 标识不能携带正文进入群。
    const privateTarget = candidate && ['c2c', 'direct'].includes(candidate.scope) ? candidate : null;

    return await deliverNotification({ privateTarget, recipientBid: bid, data, enabled, fallbackOnFailure: true }, notificationChannel);
  });

  if (privateDelivery.route === 'private') {
    return privateDelivery;
  }
  // 与普通通知同一规则：订阅群是唯一可提醒的群。
  // 玩家最近发过言的其他群不因私聊失败而收到任何内容。
  const owner = ownerUserId ?? ownerPlayerId(eventId);
  const group = owner > 0 ? subscriberGroup(await getNotificationSubscriptionTarget(owner)) : null;

  if (!group) {
    return { route: 'history', reason: 'no_target' };
  }
  const reminder = Format.create().addMarkdown(Format.createMarkdown().addText('你有新的飞信，请私聊机器人发送 /飞信 查看。')).value;

  if (!(await acquireFlyMailGroupReminder(platform, bid))) {
    return { route: 'history', reason: 'group_reminder_cooldown' };
  }
  const delivery = await withFlyMailGroupReminder(bid, () => deliverNotification(
      { group, recipientBid: bid, data: notificationSettingsData(reminder, 'flymail.message.received'), enabled, fallbackOnFailure: true },
      notificationChannel
    )
  );

  return delivery.route === 'group' ? { route: 'group', reason: 'reminded' } : { route: 'history', reason: 'no_target' };
}

/** 仅当订阅开启时返回订阅群目标；未订阅或已关闭时不向任何群投递。 */
export function subscriberGroup(
  subscription: { isEnabled: boolean; platform: string; channelId: string; botId: string | null; targetScope: 'group' | 'channel' } | null
): NotificationTarget | null {
  if (!subscription?.isEnabled) {
    return null;
  }

  return { platform: subscription.platform, scope: subscription.targetScope, targetId: subscription.channelId, BotId: subscription.botId ?? undefined };
}

/** 飞信事件 ID 形如 flymail.message:{消息ID}:received:{玩家ID}，只读取末尾的玩家 ID。 */
export function ownerPlayerId(eventId: string): number {
  const value = Number(eventId.slice(eventId.lastIndexOf(':') + 1));

  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
