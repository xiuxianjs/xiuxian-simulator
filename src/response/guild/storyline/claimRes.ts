import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildWorkflow } from '@src/api/bot/guild-workflow';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const text = (e.MessageText ?? '').trim();
  const match = text.match(/^(!|！|\/|#|＃)?领取宗门主线奖励(?:\s+([1-4]))?$/);
  const stageIndex = match?.[2] ? Number(match[2]) : null;
  const send = async (text: string) => {
    const md = Format.createMarkdown();

    md.addNewline();
    md.addText(text);
    await message.send(FormatGui({ isPrivate, bid, title: '宗门主线奖', content: md }));
  };
  const loaded = await runRobotBusiness(
    e,
    'guild.storyline-claim',
    { stageIndex },
    (value, uid) => parseGuildWorkflow({ action: 'storyline_claim', ...(stageIndex ? { stageIndex } : {}) }, uid, value),
    next,
    async reply => {
      await send(reply.text);
    }
  ).catch(async error => {
    await send(error instanceof Error ? error.message : '领取宗门主线奖励失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  if (loaded.data.partial) {
    const md = Format.createMarkdown()
      .addText(`已领取第${loaded.data.claimedStages!.join('、')}关奖励，获得灵晶${loaded.data.spiritCrystal}`)
      .addNewline()
      .addText(`第${loaded.data.failedStage}关领取中断：${loaded.data.failureReason}`);

    appendMiddlewareAdvice(md, [
      { command: '/宗门主线', description: '已列出的奖励已经到账，后续中断不代表整批回滚；先核对剩余奖励和当前条件，不重复领取已到账关卡' }
    ]);
    await message.send(FormatGui({ isPrivate, bid, title: '宗门主线奖', content: md }));

    return;
  }
  await send(`奖励领取成功，获得灵晶${loaded.data.spiritCrystal}`);
});
