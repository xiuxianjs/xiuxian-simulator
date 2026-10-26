import { useMessage } from '@src/utils/useMessage';
/**
 * 信誉分查询指令
 * 指令：#信誉分 / #我的信誉
 */
import { parseMarketCredibility } from '@src/api/bot/market-credibility';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown().addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  };
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'market.credibility', {}, parseMarketCredibility, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch {
    await sendFailure('查询信誉分失败，请稍后再试。');

    return;
  }
  if (loaded.handled) {
    return;
  }

  const md = Format.createMarkdown();
  const info = loaded.data;

  md.addText('【交易信誉】');
  md.addNewline();
  md.addText(`综合信誉分：${info.totalScore} / ${info.maxScore}`);
  md.addNewline();
  md.addText(info.progressBar);
  md.addNewline();
  md.addNewline();

  md.addText('【分数明细】');
  md.addNewline();
  md.addBlockquote(
    Format.createMarkdown()
      .addText(`基础分：${info.baseScore}`)
      .addNewline()
      .addText(`月卡加成：+${info.monthCardBonus}`)
      .addNewline()
      .addText(`活跃分：+${info.activityScore}`)
  );

  md.addText('【状态】');
  md.addNewline();

  md.addBlockquote(Format.createMarkdown().addText(info.statusText));

  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(`每日免信誉扣分撤单：${info.dailyFreeCancelLimit} 次`));

  void message.send(FormatGui({ isPrivate, bid, title: '交易信誉', content: md }));
});
