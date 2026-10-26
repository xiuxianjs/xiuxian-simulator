import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseBlessMasterCommand, masterMentionBid } from '@src/utils/masterCommand';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterTargetAction } from '@src/api/bot/master-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const parsed = parseBlessMasterCommand(e.MessageText || '');
  const targetBid = await masterMentionBid(mention);
  let data: ReturnType<typeof parseMasterTargetAction>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'master.bless',
      { targetArg: parsed ?? '', ...(targetBid ? { targetBid } : {}) },
      value => parseMasterTargetAction(value, '赐福'),
      next
    );

    if (loaded.handled) {
      return;
    }
    data = loaded.data;
  } catch (error) {
    void message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '操作失败') }));

    return;
  }
  if (data.outcome === 'usage') {
    const md = Format.createMarkdown();

    md.addText('使用方法：赐福 <徒弟UID|@目标>');
    appendMiddlewareAdvice(md, masterRecoveryTips('master.bless', '使用方法：赐福'));
    md.addNewline();
    md.addText('消耗：元力丹×1');
    md.addNewline();
    md.addText('效果：为徒弟提供12小时修为加成，并计入1次师门互动');

    void message.send(FormatGui({ isPrivate, bid, title: '【赐福】', content: md }));

    return;
  }
  const md = Format.createMarkdown();

  md.addText(data.message);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
