import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseMasterGiftCommand, masterMentionBid } from '@src/utils/masterCommand';
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
  const parsed = parseMasterGiftCommand(e.MessageText || '');
  const targetBid = await masterMentionBid(mention);
  let data: ReturnType<typeof parseMasterTargetAction>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'master.gift',
      { targetArg: parsed?.discipleArg ?? '', ...(targetBid ? { targetBid } : {}), ...(parsed?.pillType ? { itemKey: parsed.pillType } : {}) },
      value => parseMasterTargetAction(value, '赐丹'),
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

    md.addText('使用方法：赐丹 <徒弟UID|@目标> [培元丹|筑基丹]');
    appendMiddlewareAdvice(md, masterRecoveryTips('master.gift', '使用方法：赐丹'));
    md.addNewline();
    md.addText('默认：练气徒弟优先筑基丹×1，筑基及以上徒弟默认培元丹×2');
    md.addNewline();
    md.addText('可选：手动指定培元丹×2或筑基丹×1');

    void message.send(FormatGui({ isPrivate, bid, title: '【赐丹】', content: md }));

    return;
  }
  const md = Format.createMarkdown();

  md.addText(data.message);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
