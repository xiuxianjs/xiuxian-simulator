import { useMessage } from '@src/utils/useMessage';
/**
 * 同意道侣申请指令
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotCompanionProposalAction } from '@src/api/bot/companion-actions-robot';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?同意道侣\s+(.+)$/);

  const proposerName = match?.[1]?.trim();

  const [, next] = useEvent();
  const response = await runRobotBusiness(e, 'companion.accept', { name: proposerName ?? '' }, parseRobotCompanionProposalAction, next, async reply => {
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

  if (result.mode === 'list') {
    if (result.received.length === 0) {
      const md = Format.createMarkdown();

      md.addBold('【道侣申请】');
      md.addNewline();
      md.addText('暂无待处理的道侣申请');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const md = Format.createMarkdown();

    md.addBold('【道侣申请】');
    md.addNewline();
    md.addText('待处理的道侣申请：');
    md.addNewline();
    for (let i = 0; i < result.received.length; i++) {
      const p = result.received[i];

      md.addText(`【${i + 1}】${p.fromName}（灵契值：${p.intimacy}）`);

      addOptions(md, [
        { label: '同意', command: `/同意道侣 ${p.fromName}` },
        { label: '拒绝', command: `/拒绝道侣 ${p.fromName}` }
      ]);
    }

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();
  const repeatMsg = result.message;

  md.addText(repeatMsg);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
