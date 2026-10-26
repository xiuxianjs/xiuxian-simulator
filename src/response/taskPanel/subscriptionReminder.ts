import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { requestBackend } from '@src/api/bot/client';
import { validateGroupSubscription } from '@src/api/bot/group-subscription-queries';
import type { GameEvent } from '@src/types/event';
import { FormatGui } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger } from 'alemonjs';

// 仅机器人端抽查订阅，不影响任务状态；提醒必须作为独立消息发送。
const SUBSCRIPTION_CHECK_PROBABILITY = 0.1;

export async function sendTaskPanelSubscriptionReminder(event: GameEvent): Promise<void> {
  const uid = event.uid;

  if (!event.UserId || !Number.isInteger(uid) || uid <= 0 || Math.random() >= SUBSCRIPTION_CHECK_PROBABILITY) {
    return;
  }

  try {
    const subscription = validateGroupSubscription(
      await requestBackend(event.UserId, 'get_players_id_notifications_group_subscription', { path: { id: uid } })
    );

    // 订阅可指向其他群；投递受限或暂时失败也不代表玩家关闭了订阅。
    if (subscription?.isEnabled) {
      return;
    }
    const [message] = useMessage(event);
    const canEnableHere = !isPrivateEvent(event) && !!event.ChannelId;
    const quote = Format.createMarkdown().addText(canEnableHere ? '尚未开启群通知。' : '尚未开启群通知，可在常用群开启订阅。');

    quote.addText(' ').addButton(markdownButtonLabel(canEnableHere ? '开启群通知' : '我的设置'), { data: canEnableHere ? '/开启群订阅' : '/我的设置' });
    await message.send(
      FormatGui({ isPrivate: isPrivateEvent(event), bid: event.UserId, title: '修行提醒', content: Format.createMarkdown().addBlockquote(quote) })
    );
  } catch (error) {
    // 附加提醒失败不能影响已经发送的任务面板，也不能把查询失败当成未订阅。
    logger.warn('任务面板群订阅提醒未完成:', error);
  }
}
