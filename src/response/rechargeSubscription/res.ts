import { onResponse, useEvent } from 'alemonjs';
import { rechargeSubscriptionCommand } from '@src/api/bot/recharge-subscription';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { noticeBubble } from '@src/response/presentation';

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const text = (event.MessageText ?? '').trim().replace(/^[/#＃]/, '');

  if (!['订阅充值', '取消订阅充值', '充值身份'].includes(text)) {
    next();

    return;
  }
  const [message] = useMessage();
  let content: string;

  try {
    content = await rechargeSubscriptionCommand(event, text === '充值身份' ? 'identity' : text === '订阅充值' ? 'subscribe' : 'unsubscribe');
  } catch (error) {
    content = error instanceof Error ? error.message : '充值订阅失败。';
  }
  await message.send(
    noticeBubble({
      title: '充值订阅',
      bid: event.UserId,
      isPrivate: [event.IsPrivate, event.isPrivate, event.name.startsWith('private.')].some(Boolean),
      lines: [content]
    })
  );
});
