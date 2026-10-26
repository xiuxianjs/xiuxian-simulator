import { useMessage } from '@src/utils/useMessage';
/**
 * 拒绝道侣申请指令
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCompanionRejection } from '@src/api/bot/companion-actions-robot';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?拒绝道侣\s+(.+)$/);

  const [, next] = useEvent();
  const response = await runRobotBusiness(e, 'companion.reject', { name: match?.[1]?.trim() ?? '' }, parseRobotCompanionRejection, next, async reply => {
    const md = Format.createMarkdown();

    if (reply.heading) {
      md.addBold(reply.heading).addNewline();
    }
    md.addText(reply.text);
    await message.send(FormatGui({ isPrivate, bid, title: reply.title, content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
  });

  if (response.handled) {
    return;
  }
  const result = response.data;

  const md = Format.createMarkdown();
  const repeatMsg = result.message;

  md.addText(repeatMsg);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
