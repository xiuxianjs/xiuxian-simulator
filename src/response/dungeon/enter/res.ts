import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
import { displayCurrencyText } from '@src/constants/currency';
/** 秘境挑战：机器人仅路由服务端挑战并展示返回结算。 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { dungeonChallengeArguments, parseRobotDungeonChallenge } from '@src/api/bot/dungeon-challenge-robot-query';
import { parseDungeonCommand } from './command';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { dungeonNoRewardText } from '@src/response/adventureRecovery';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const parsed = parseDungeonCommand(e.MessageText || '');

  const [, next] = useEvent();
  const sendFailure = async (reply: Pick<RobotMiddlewareReply, 'text' | 'buttons'>) => {
    const md = Format.createMarkdown().addText(reply.text);

    await message.send(FormatGui({ isPrivate, bid, title: '秘境挑战', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
  };
  const loaded = await runRobotBusiness(
    e,
    'dungeon.challenge',
    dungeonChallengeArguments(e.MessageText || ''),
    parseRobotDungeonChallenge,
    next,
    sendFailure
  ).catch(async error => {
    await sendFailure({
      text: error instanceof Error ? error.message : '秘境挑战失败',
      buttons: [
        { label: '我的队伍', command: '/我的队伍' },
        { label: '查看秘境', command: '/查看秘境' }
      ]
    });

    return { handled: true as const };
  });

  if (loaded.handled || loaded.data.outcome === 'no_match' || !parsed.ok) {
    return;
  }
  const data = loaded.data.data;
  const uid = e.uid as number;
  const md = Format.createMarkdown();
  const ownReward = data.rewardsByUser.find(reward => reward.userId === uid);

  md.addText(data.won ? '秘境挑战成功' : '秘境挑战失败');
  md.addNewline();
  md.addText(`战斗结果：${data.battle.winner === 'A' ? '你方胜利' : data.battle.winner === 'B' ? '对方胜利' : '平局'}，共 ${data.battle.rounds} 回合`);
  if (ownReward && ownReward.spiritCostPaid > 0) {
    md.addNewline().addText(`精力 -${ownReward.spiritCostPaid}`);
  }
  if (data.won) {
    if (!ownReward?.eligible) {
      md.addNewline();
      md.addText(`本次参战无收益（${dungeonNoRewardText(ownReward?.noRewardReason)}）`);
    } else {
      md.addNewline();
      md.addText(`修为 +${ownReward.experienceGained}`);
      const rewards = [...ownReward.currency, ...ownReward.items];

      if (rewards.length) {
        md.addNewline();
        md.addText(`获得：${rewards.map(reward => `${displayCurrencyText(reward.name)}×${reward.amount}`).join('、')}`);
      }
      if (ownReward.firstClear?.length) {
        md.addNewline();
        md.addText(`首通奖励：${ownReward.firstClear.map(reward => `${displayCurrencyText(reward.name)}×${reward.amount}`).join('、')}`);
      }
    }
  }
  if (!data.won || !ownReward?.eligible) {
    const reason = data.won ? (ownReward?.noRewardReason ?? '') : '战斗结果：未获胜';

    appendMiddlewareAdvice(
      md,
      withBusinessRecovery('dungeon.challenge', {
        title: '',
        heading: '',
        text: reason,
        buttons: [],
        advice: []
      }).advice
    );
  }
  const footer = [
    ...(data.logId ? [{ label: '文字记录', command: `/查看战斗过程 ${data.logId}` }] : []),
    ...(data.won && ownReward?.eligible ? [{ label: '继续挑战', command: `/秘境挑战 ${parsed.dungeonName}` }] : [])
  ];

  void message.send(
    await BattleFormatGui(
      {
        isPrivate,
        bid,
        title: '秘境结算',
        content: md,
        header: [
          { label: '返回', command: '/查看秘境' },
          { label: '队伍', command: '/我的队伍' }
        ],
        footer
      },
      [{ id: data.logId }]
    )
  );
});
