import { Format, onResponse, useEvent } from 'alemonjs';
import { customerSupportCommand, rememberCustomerSupportIdentity, type SupportInput } from '@src/api/bot/customer-support';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const text = (event.MessageText ?? '').trim().replace(/^[/#＃]/, '');
  const match = /^(呼叫客服|客服身份|客服列表|继续等待|客服|接待|回复|结束客服)(?:\s+([\s\S]*))?$/.exec(text);

  if (!match) {
    next();

    return;
  }
  const [message] = useMessage();
  const send = async (value: string) => {
    await message.send({ format: Format.create().addText(value) });
  };

  if (!(event.IsPrivate || event.isPrivate || event.name.startsWith('private.'))) {
    await send('请私聊机器人使用客服功能。');

    return;
  }
  if (match[1] === '客服身份') {
    try {
      await rememberCustomerSupportIdentity(event);
    } catch (error) {
      await send(error instanceof Error ? error.message : '私聊地址登记失败');

      return;
    }
    await send(`客服平台用户标识：${event.UserId}\n机器人 AppID：${event.BotId}\n请将此标识交给后台管理员添加客服。`);

    return;
  }
  let input: SupportInput;
  const value = (match[2] ?? '').trim();

  if (match[1] === '继续等待') {
    input = { action: 'continue' };
  } else if (match[1] === '呼叫客服') {
    input = { action: 'call', content: value };
  } else if (match[1] === '客服列表') {
    input = { action: 'pending' };
  } else if (match[1] === '客服') {
    input = { action: 'reply', content: value };
  } else {
    const args = /^([1-9]\d*)(?:\s+([\s\S]*))?$/.exec(value);

    if (!args && match[1] !== '结束客服') {
      await send('格式：/接待 会话编号 或 /回复 会话编号 内容');

      return;
    }
    input = { action: match[1] === '接待' ? 'claim' : match[1] === '回复' ? 'reply' : 'close', conversationId: args?.[1], content: args?.[2] };
  }
  try {
    const result = await customerSupportCommand(event, input);

    if (input.action === 'pending') {
      await send(
        (result.conversations ?? []).map(item => `#${item.id} ${item.status === 'waiting' ? '待接待' : '接待中'}`).join('\n') ||
          '当前没有待接待或由你接待的会话。'
      );
    } else {
      await send(
        result.notice ??
          `客服会话 #${result.conversationId ?? ''}：${input.action === 'claim' ? '已接待，直接发送普通文字即可回复' : input.action === 'close' ? '已结束' : '消息已登记'}。`
      );
    }
  } catch (error) {
    await send(error instanceof Error ? error.message : '客服请求失败。');
  }
});
