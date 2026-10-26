import { parseTianjiaoLeaderboard } from './tianjiao-leaderboard-queries';
import { parseTianjiaoRewards } from './tianjiao-rewards-queries';
import { parseTianjiaoChallenge } from './tianjiao-challenge';
import { displayCurrencyText } from '@src/constants/currency';
import type { TianjiaoLeaderboardAppResult } from '@src/response-apps/tianjiao/leaderboard/app';
import type { TianjiaoRewardsAppResult } from '@src/response-apps/tianjiao/rewards/app';

export const parseRobotTianjiaoLeaderboard = (value: unknown) => presentTianjiaoLeaderboard(parseTianjiaoLeaderboard(value));
export const parseRobotTianjiaoRewards = (value: unknown) => presentTianjiaoRewards(parseTianjiaoRewards(value));
export function tianjiaoChallengeArgument(text: string): string {
  return text.match(/^(?:!|！|\/|#|＃)?(?:登天挑战|天骄挑战)\s+(\d+)$/)?.[1] ?? '';
}
export function parseRobotTianjiaoChallenge(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const outcome = (value as Record<string, unknown>).outcome;

    if (outcome === 'no_match') {
      return { code: 'NO_MATCH' as const };
    }
    if (outcome === 'param_error') {
      return { code: 'PARAM_ERROR' as const };
    }
  }
  const result = parseTianjiaoChallenge(value);

  if (!result.success) {
    throw new Error('登天挑战业务回执分支无效');
  }

  return presentTianjiaoChallenge(result);
}

export function presentTianjiaoLeaderboard(access: ReturnType<typeof parseTianjiaoLeaderboard>): Exclude<TianjiaoLeaderboardAppResult, { code: 'NO_MATCH' }> {
  if (!access.isVisible) {
    return { code: 'LOCKED', message: access.lockedMessage };
  }

  const result = access;

  const entries = result.entries.map(entry => {
    const selfTag = entry.isMe ? ' · 你' : '';
    const text = entry.occupied ? `第${entry.rank}名：${entry.userName}（${entry.realmName}，战力${entry.power ?? 0}）${selfTag}` : `第${entry.rank}名：空位`;
    const canChallenge =
      result.canChallenge &&
      result.attemptsLeft > 0 &&
      !entry.isMe &&
      entry.rank >= 1 &&
      (result.myRank === null ? entry.rank <= 10 : entry.rank < result.myRank && entry.rank <= 20);

    return { text, challengeRank: canChallenge ? entry.rank : null, challengeLabel: entry.occupied ? ('挑战' as const) : ('占位' as const) };
  });

  return {
    code: 'SUCCESS',
    data: {
      stageName: result.stageName,
      myRank: result.myRank,
      attemptsLeft: result.attemptsLeft,
      suggestedTarget: result.suggestedTarget,
      canChallenge: access.canChallenge,
      requiredText: access.requiredText,
      entries
    }
  };
}

export function presentTianjiaoRewards(data: ReturnType<typeof parseTianjiaoRewards>): Exclude<TianjiaoRewardsAppResult, { code: 'NO_MATCH' }> {
  if (!data.isVisible) {
    return { code: 'LOCKED', message: data.view.lockedMessage };
  }

  return {
    code: 'SUCCESS',
    data: {
      stageLevel: data.stageLevel,
      stageName: data.stageName,
      tiers: data.view.tiers.map(tier => ({ ...tier, rewardText: displayCurrencyText(tier.rewardText) })),
      records: data.view.records.map(record => ({ ...record, rewardText: displayCurrencyText(record.rewardText) })),
      recordTotal: data.view.recordTotal
    }
  };
}

export function presentTianjiaoChallenge(r: ReturnType<typeof parseTianjiaoChallenge>): {
  code: 'SUCCESS';
  data: { title: string; lines: string[]; logId?: string };
} {
  const lines: string[] = [];

  if (r.oldRank && r.newRank && r.oldRank !== r.newRank) {
    lines.push(`排名变化：第${r.oldRank}名 → 第${r.newRank}名`);
  } else if (!r.oldRank && r.newRank) {
    lines.push(`首次上榜：第${r.newRank}名`);
  } else if (r.newRank) {
    lines.push(`当前排名：第${r.newRank}名`);
  }
  if (r.directOccupy) {
    lines.push('目标位置为空，本次无需战斗，已直接占位');
  }
  if (r.rewardText) {
    lines.push('奖励发放：', ...displayCurrencyText(r.rewardText).split('\n'));
  }
  if (r.battle) {
    lines.push(
      '',
      '战斗情况',
      '战斗类型：1v1',
      `总回合数：${r.battle.rounds}`,
      `我方：${r.battle.sideA[0]?.name ?? ''} HP ${r.battle.sideA[0]?.hp ?? 0}/${r.battle.sideA[0]?.maxHp ?? 0} ${r.battle.sideA[0]?.isDead ? '☠️' : '✓'}`,
      `对方：${r.battle.sideB[0]?.name ?? ''} HP ${r.battle.sideB[0]?.hp ?? 0}/${r.battle.sideB[0]?.maxHp ?? 0} ${r.battle.sideB[0]?.isDead ? '☠️' : '✓'}`
    );
  }

  return { code: 'SUCCESS', data: { title: r.directOccupy ? '占位成功' : '挑战成功', lines, logId: r.logId } };
}
