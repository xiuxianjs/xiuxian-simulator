import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotTowerChallenge, rankingChallengeArgument } from '@src/api/bot/ranking-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let result: ReturnType<typeof parseRobotTowerChallenge>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'ranking.challenge',
      { rankArg: rankingChallengeArgument(e.MessageText || '') },
      parseRobotTowerChallenge,
      next,
      async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '',
            content: Format.createMarkdown().addText(reply.text),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      }
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    void message.send(
      FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '挑战排名失败，请稍后再试') })
    );

    return;
  }
  const md = Format.createMarkdown();

  if (result.code === 'PARAM_ERROR') {
    md.addText('请输入正确的格式：/挑战排名 [排名]');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }
  const data = result.data;

  md.addBold(data.battle.winner === 'A' ? '挑战成功！' : '挑战失败').addNewline();
  md.addText(data.message).addNewline();
  md.addText(`修为 +${data.experienceGained}${data.experienceBonusText}  声望 +${data.reputationGained}`).addNewline();
  md.addText(`总回合数：${data.battle.rounds}；胜利方：${data.battle.winner === 'A' ? '你方' : '对方'}`);
  void message.send(
    await BattleFormatGui(
      {
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          ...(data.logId ? [{ label: '文字记录', command: `/查看战斗过程 ${data.logId}` }] : []),
          { label: '通天塔', command: '/通天塔' },
          { label: '首通奖励', command: '/首通排名奖励' }
        ]
      },
      [{ id: data.logId }]
    )
  );
});
