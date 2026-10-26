import { useMessage } from '@src/utils/useMessage';
/**
 * 解除道侣指令
 * - /解除道侣          → 提示再次发送带「确认」的指令完成解除
 * - /解除道侣 确认     → 直接执行解除
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCompanionBreakup } from '@src/api/bot/companion-actions-robot';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const rawText = (e.MessageText ?? '').trim();
  const confirmed = /^[!！/#＃]?解除道侣\s+确认$/.test(rawText);

  const [, next] = useEvent();
  const response = await runRobotBusiness(e, 'companion.breakup', { confirmed }, parseRobotCompanionBreakup, next, async reply => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: reply.title,
        content: Format.createMarkdown().addText(reply.text),
        footer: reply.buttons.length ? reply.buttons : undefined
      })
    );
  });

  if (response.handled) {
    return;
  }
  const result = response.data;

  if (result.mode === 'preview') {
    const { partnerName } = result;
    const md = Format.createMarkdown();

    md.addText(`确定要与「${partnerName}」解除道侣关系吗？`);
    md.addNewline();
    md.addText('解除后将降为普通好友，灵契值保留。');
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [{ label: '确认解除', command: '/解除道侣 确认' }]
      })
    );

    return;
  }

  const md = Format.createMarkdown();

  md.addText(result.message);
  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(result.narrativeText));

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
