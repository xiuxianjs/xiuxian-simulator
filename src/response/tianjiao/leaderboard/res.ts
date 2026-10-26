import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotTianjiaoLeaderboard } from '@src/api/bot/tianjiao-robot-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let result: ReturnType<typeof parseRobotTianjiaoLeaderboard>;

  try {
    const loaded = await runRobotBusiness(e, 'tianjiao.leaderboard', {}, parseRobotTianjiaoLeaderboard, next);

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

  const myRankText = result.data.myRank ? `第${result.data.myRank}名` : '未入榜';
  const challengeStatus = !result.data.canChallenge
    ? `${result.data.requiredText}，当前仅可预览榜单与奖励`
    : result.data.attemptsLeft <= 0
      ? '今日次数已用完'
      : '已开放';

  md.addText(`🏆 ${result.data.stageName}登天梯`);
  md.addNewline();
  md.addBlockquote(
    Format.createMarkdown()
      .addText(`我的排名：${myRankText}`)
      .addNewline()
      .addText(`今日剩余次数：${result.data.attemptsLeft}`)
      .addNewline()
      .addText(`挑战状态：${challengeStatus}`)
  );

  result.data.entries.forEach(entry => {
    md.addBlockquote(
      createQuoteMarkdown([entry.text], entry.challengeRank !== null ? [{ label: entry.challengeLabel, command: `/登天挑战 ${entry.challengeRank}` }] : [])
    );
    md.addNewline();
  });

  const footer = [
    { label: '登天奖励', command: '/登天奖励' },
    { label: '我的活动', command: '/我的活动' },
    { label: '排行榜', command: '/排行榜' }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));
});
