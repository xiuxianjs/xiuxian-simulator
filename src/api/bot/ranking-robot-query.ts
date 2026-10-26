import { parseTowerRewardClaim } from './tower-reward-claims';
import { parseTowerFirstRewards, parseTowerMonthlyRewards } from './tower-rewards-queries';
import { parseTongtianTower, parseTongtianChallenge, parseTongtianBatch, parseTongtianSweep } from './tongtian-tower';
import type { ViewFirstRewardsResult } from '@src/response-apps/ranking/viewFirstRewards/app';
import type { ViewMonthlyRewardsResult } from '@src/response-apps/ranking/viewMonthlyRewards/app';

export function parseRobotTowerOverview(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('通天塔响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (typeof data.tianjiaoVisible !== 'boolean') {
    throw new Error('通天塔导航响应不完整');
  }

  return { code: 'MY_VIEW' as const, data: parseTongtianTower(data.view), tianjiaoVisible: data.tianjiaoVisible };
}
export const parseRobotFirstRewards = (value: unknown) => presentTowerFirstRewards(parseTowerFirstRewards(value));
export const parseRobotMonthlyRewards = (value: unknown) => presentTowerMonthlyRewards(parseTowerMonthlyRewards(value));

export function presentTowerFirstRewards(data: ReturnType<typeof parseTowerFirstRewards>): ViewFirstRewardsResult {
  if (!data.canUseFifthLayerFeature) {
    return { code: 'LOCKED', realmName: data.realmName ?? '未知' };
  }
  if (!data.isOpen) {
    return { code: 'TOWER_CLOSED', message: `通天塔每月${data.openStartDay}-${data.openEndDay}日开放，当前处于关闭阶段` };
  }

  return { code: 'OK', data: { userRank: data.userRank, maxRank: data.maxRank, rewards: data.rewards, hasClaimableReward: data.hasClaimableReward } };
}

export function presentTowerMonthlyRewards(data: ReturnType<typeof parseTowerMonthlyRewards>): ViewMonthlyRewardsResult {
  if (!data.canUseFifthLayerFeature) {
    return { code: 'LOCKED', realmName: data.realmName ?? '未知' };
  }
  if (!data.isOpen) {
    return { code: 'TOWER_CLOSED', message: `通天塔每月${data.openStartDay}-${data.openEndDay}日开放，当前处于关闭阶段` };
  }
  const statusLines: string[] = [];

  if (data.claimCount > 0) {
    statusLines.push(`✅ 本月已领取 ${data.claimCount} 个档位`);
    statusLines.push(`最高领奖排名：第 ${data.bestClaimRank} 名`);
  } else if (data.claimStatus === 'NOT_RANKED') {
    statusLines.push('本月未上榜，无月度奖励');
  } else if (data.claimStatus === 'ALL_CLAIMED') {
    statusLines.push('所有月度奖励已领取');
  }
  const rewards = data.rewards.map(reward => {
    const rangeText = reward.rankingStart === reward.rankingEnd ? `第 ${reward.rankingStart} 名` : `第 ${reward.rankingStart}-${reward.rankingEnd} 名`;
    const rewardTexts: string[] = [];

    if (reward.lingJing > 0) {
      rewardTexts.push(`灵晶 x${reward.lingJing}`);
    }
    if (reward.spiritStone > 0) {
      rewardTexts.push(`灵石 x${reward.spiritStone}`);
    }

    return { id: reward.id, rangeText, rewardTexts, state: reward.state };
  });

  return {
    code: 'OK',
    data: { currentRank: data.currentRank, bestRank: data.bestRank, maxRank: data.maxRank, statusLines, rewards, hasClaimableReward: data.hasClaimableReward }
  };
}

export function rankingClaimArgument(text: string, monthly: boolean): string {
  return (text || '').replace(monthly ? /^(!|！|\/|#|＃)?领取月度奖励\s*/ : /^(!|！|\/|#|＃)?领取首通奖励\s*/, '').trim();
}
export function parseRobotFirstClaim(
  value: unknown
):
  | { code: 'PARAM_ERROR' }
  | { code: 'BATCH_SUCCESS'; data: { claimedCount: number; rewardTexts: string[] } }
  | { code: 'SUCCESS'; data: { ranking: number; rewardTexts: string[] } } {
  const row = claimEnvelope(value);

  if (row.outcome === 'param_error') {
    return { code: 'PARAM_ERROR' };
  }
  const data = parseTowerRewardClaim(row, row.outcome === 'batch' ? 'claimedCount' : 'ranking');

  return row.outcome === 'batch'
    ? { code: 'BATCH_SUCCESS', data: { claimedCount: data.claimedCount!, rewardTexts: data.rewardTexts } }
    : { code: 'SUCCESS', data: { ranking: data.ranking!, rewardTexts: data.rewardTexts } };
}
export function parseRobotMonthlyClaim(
  value: unknown
):
  | { code: 'PARAM_ERROR' }
  | { code: 'BATCH_SUCCESS'; data: { claimedCount: number; rewardTexts: string[] } }
  | { code: 'SUCCESS'; data: { rewardTexts: string[] } } {
  const row = claimEnvelope(value);

  if (row.outcome === 'param_error') {
    return { code: 'PARAM_ERROR' };
  }
  const data = parseTowerRewardClaim(row, 'claimedCount');

  return row.outcome === 'batch'
    ? { code: 'BATCH_SUCCESS', data: { claimedCount: data.claimedCount!, rewardTexts: data.rewardTexts } }
    : { code: 'SUCCESS', data: { rewardTexts: data.rewardTexts } };
}
function claimEnvelope(value: unknown): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !['param_error', 'batch', 'single'].includes(String((value as Record<string, unknown>).outcome))
  ) {
    throw new Error('排名奖励结算响应不完整');
  }

  return value as Record<string, unknown>;
}

export function rankingChallengeArgument(text: string): string {
  return (text || '').match(/^(?:!|！|\/|#|＃)?挑战排名\s+(\d+)\s*$/)?.[1] ?? '';
}
export function rankingSweepArguments(text: string): { rankArg: string; countArg: string } {
  const match = (text || '').match(/扫荡排名\s+(\d+)(?:\s+(\d+))?\s*$/);

  return { rankArg: match?.[1] ?? '', countArg: match?.[2] ?? '5' };
}
export function parseRobotTowerChallenge(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value) && (value as Record<string, unknown>).outcome === 'param_error') {
    return { code: 'PARAM_ERROR' as const };
  }

  return { code: 'SUCCESS' as const, data: parseTongtianChallenge(value) };
}
export const parseRobotTowerBatch = (value: unknown) => ({ code: 'OK' as const, data: parseTongtianBatch(value) });
export function parseRobotTowerSweep(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('通天塔扫荡响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'list') {
    const view = parseTongtianTower(row.view);

    return view.sweepTargets.length ? { code: 'LIST' as const, data: { myRank: view.myRank, entries: view.sweepTargets } } : { code: 'LIST_EMPTY' as const };
  }
  if (row.outcome === 'sweep') {
    return { code: 'SWEEP' as const, data: parseTongtianSweep(row.data) };
  }
  throw new Error('通天塔扫荡响应不完整');
}
