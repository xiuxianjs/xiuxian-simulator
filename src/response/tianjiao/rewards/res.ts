import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotTianjiaoRewards } from '@src/api/bot/tianjiao-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let result: ReturnType<typeof parseRobotTianjiaoRewards>;

  try {
    const loaded = await runRobotBusiness(e, 'tianjiao.rewards', {}, parseRobotTianjiaoRewards, next);

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    void message.send(
      FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '登天梯查询失败') })
    );

    return;
  }

  const md = Format.createMarkdown();

  if (result.code === 'LOCKED') {
    md.addText(result.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '我的活动', command: '/我的活动' }] }));

    return;
  }

  md.addText(`🎁 ${result.data.stageName}登天奖励`);
  md.addNewline();
  md.addNewline();
  md.addBold('当前大境界 1-10 名奖励');
  md.addNewline();

  for (const tier of result.data.tiers) {
    const claimedText = tier.claimedAt ? ` · 已于 ${formatGameTime(tier.claimedAt)} 领取` : '';

    md.addText(`第${tier.rank}名：${tier.rewardText}${claimedText}`);
    md.addNewline();
  }

  md.addNewline();
  md.addBold('我的领取记录');
  md.addNewline();

  if (result.data.records.length === 0) {
    md.addText('暂无领取记录');
    md.addNewline();
  } else {
    result.data.records.forEach(record => {
      md.addText(`${record.stageName} 第${record.rank}名：${record.rewardText} · ${formatGameTime(record.claimedAt)}`);
      md.addNewline();
    });

    if (result.data.recordTotal > result.data.records.length) {
      md.addText(`仅展示最近20条，共 ${result.data.recordTotal} 条记录`);
      md.addNewline();
    }
  }

  const footer = [
    { label: '登天梯', command: '/登天梯' },
    { label: '我的活动', command: '/我的活动' },
    { label: '排行榜', command: '/排行榜' }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));
});
