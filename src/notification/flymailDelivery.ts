import { Format, type DataEnums } from 'alemonjs';
import { readPlatformAvailability, readPlatformGroupCandidates } from '@src/api/bot/notification-cache';
import { type NotificationDelivery } from '@src/types/notification';
import { FormatGui } from '@src/utils/messageHelper';
import { notificationChannel, getNotificationPrivateTarget } from './channel';
import { deliverNotification, legacyNotificationTarget } from './delivery';
import { deliverNotificationOnce } from './service';

/** 所有飞信仅向收件人私聊发送正文；群内仅发送不含会话信息的提醒。 */
export async function deliverFlyMailNotification(eventId: string, bid: string, data: DataEnums[], enabled: boolean): Promise<NotificationDelivery> {
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
  const reminder = FormatGui({
    bid,
    bar: false,
    content: Format.createMarkdown().addText('你有新的飞信，请私聊机器人发送 /飞信 查看。')
  }).format.value;
  const groups = await readPlatformGroupCandidates(platform, bid);

  for (const { target } of groups) {
    if ((await readPlatformAvailability(target, bid))?.available === false) {
      continue;
    }
    const delivery = await deliverNotification({ group: target, recipientBid: bid, data: reminder, enabled, fallbackOnFailure: true }, notificationChannel);

    if (delivery.route === 'group') {
      return { route: 'group', reason: 'reminded' };
    }
  }

  return { route: 'history', reason: 'no_target' };
}
