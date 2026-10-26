import { Format } from 'alemonjs';
import { FormatGui } from './messageHelper';
import { useMessage } from './useMessage';

/** Reject public account commands before reading account data or calling APIs. */
export async function requirePrivateAccountMessage(event: { isPrivate?: boolean; UserId: string }): Promise<boolean> {
  if (event.isPrivate === true) {
    return true;
  }
  const [message] = useMessage();
  const md = Format.createMarkdown();

  md.addText('安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。');
  await message.send(FormatGui({ isPrivate: false, bid: event.UserId, title: '账号安全', content: md, bar: false }));

  return false;
}
