import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}
function integer(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(message);
  }

  return value;
}
export type GuildStorylineHome = {
  guildId: number;
  progress: Record<string, unknown>;
  stage: Record<string, unknown>;
  personalAttemptsUsed: number;
  claimableStages: number[];
  home: GuildStorylineHomeView;
};
export type GuildStorylineHomeView = {
  participationRewardContribution?: number;
  allCleared: boolean;
  guildName: string;
  guildLevel: number;
  stageIndex: number;
  stageName: string;
  isElite: boolean;
  bossRemainingHp: number;
  bossMaxHp: number;
  totalDamage: number;
  retryBuffUsesLeft: number;
  retryBuffDamageRate: number;
  retryBuffText: string;
  personalAttemptsUsed: number;
  personalAttemptsLimit: number;
  personalDamage: number;
  personalParticipation: number;
  personalEffectiveChallenges: number;
  claimableStagesText: string;
  hasClaimableStages: boolean;
  canChallenge: boolean;
};
export function parseGuildStorylineHomeView(value: unknown): GuildStorylineHomeView {
  const row = record(value, '宗门主线首页投影不完整');
  const numeric = (key: string) => {
    const value = row[key];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`宗门主线首页缺少${key}`);
    }

    return value;
  };
  const string = (key: string) => {
    if (typeof row[key] !== 'string') {
      throw new Error(`宗门主线首页缺少${key}`);
    }

    return row[key];
  };
  const boolean = (key: string) => {
    if (typeof row[key] !== 'boolean') {
      throw new Error(`宗门主线首页缺少${key}`);
    }

    return row[key];
  };

  return {
    ...(row.participationRewardContribution === undefined ? {} : { participationRewardContribution: numeric('participationRewardContribution') }),
    allCleared: boolean('allCleared'),
    guildName: string('guildName'),
    guildLevel: numeric('guildLevel'),
    stageIndex: numeric('stageIndex'),
    stageName: string('stageName'),
    isElite: boolean('isElite'),
    bossRemainingHp: numeric('bossRemainingHp'),
    bossMaxHp: numeric('bossMaxHp'),
    totalDamage: numeric('totalDamage'),
    retryBuffUsesLeft: numeric('retryBuffUsesLeft'),
    retryBuffDamageRate: numeric('retryBuffDamageRate'),
    retryBuffText: string('retryBuffText'),
    personalAttemptsUsed: numeric('personalAttemptsUsed'),
    personalAttemptsLimit: numeric('personalAttemptsLimit'),
    personalDamage: numeric('personalDamage'),
    personalParticipation: numeric('personalParticipation'),
    personalEffectiveChallenges: numeric('personalEffectiveChallenges'),
    claimableStagesText: string('claimableStagesText'),
    hasClaimableStages: boolean('hasClaimableStages'),
    canChallenge: boolean('canChallenge')
  };
}
export async function getBackendGuildStorylineHome(bid: string | undefined, uid: number): Promise<GuildStorylineHome> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseGuildStorylineHome(await requestBackend(bid, 'get_players_id_guild_storyline', { path: { id: uid } }));
}

export function parseGuildStorylineHome(value: unknown): GuildStorylineHome {
  const data = record(value, '宗门主线资料不完整');

  return {
    guildId: integer(data.guildId, '宗门主线资料缺少宗门'),
    progress: record(data.progress, '宗门主线资料缺少进度'),
    stage: record(data.stage, '宗门主线资料缺少关卡'),
    personalAttemptsUsed: integer(data.personalAttemptsUsed, '宗门主线资料缺少次数'),
    home: parseGuildStorylineHomeView(data.home),
    claimableStages: Array.isArray(data.claimableStages)
      ? data.claimableStages.map(value => integer(value, '宗门主线可领奖关卡无效'))
      : (() => {
          throw new Error('宗门主线资料缺少可领奖关卡');
        })()
  };
}
export type GuildStorylineChallenge = Record<string, unknown> & {
  stageIndex: number;
  reward: Record<string, unknown> & {
    damageDealt: number;
    bossHpBefore: number;
    bossHpAfter: number;
    stageCleared: boolean;
    eliteDrop?: { rewardName: string; quantity: number } | null;
  };
};
export async function challengeBackendGuildStoryline(
  bid: string | undefined,
  uid: number,
  request: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildStorylineChallenge> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildStorylineChallenge(
    await requestBackend(bid, 'post_players_id_guild_storyline_challenge', {
      path: { id: uid },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildStorylineChallenge(value: unknown): GuildStorylineChallenge {
  const data = record(value, '宗门主线挑战结算不完整');
  const stageIndex = integer(data.stageIndex, '宗门主线挑战关卡不完整');

  if (stageIndex <= 0) {
    throw new Error('宗门主线挑战关卡不完整');
  }
  const reward = record(data.reward, '宗门主线挑战结算不完整');
  const amount = (key: string) => {
    const value = integer(reward[key], `宗门主线挑战${key}不完整`);

    if (value < 0) {
      throw new Error(`宗门主线挑战${key}不完整`);
    }

    return value;
  };

  if (typeof reward.stageCleared !== 'boolean') {
    throw new Error('宗门主线挑战通关状态不完整');
  }

  let eliteDrop: { rewardName: string; quantity: number } | null | undefined;

  if (reward.eliteDrop !== null && reward.eliteDrop !== undefined) {
    const drop = record(reward.eliteDrop, '宗门主线精英掉落不完整');

    if (typeof drop.rewardName !== 'string' || !drop.rewardName.trim() || integer(drop.quantity, '宗门主线精英掉落数量无效') <= 0) {
      throw new Error('宗门主线精英掉落不完整');
    }
    eliteDrop = { ...drop, rewardName: drop.rewardName, quantity: drop.quantity as number };
  }
  for (const key of [
    'guildContributionAdded',
    'guildContributionCurrent',
    'guildDailyActivityAdded',
    'guildDailyActivityCurrent',
    'personalAttemptsUsed',
    'personalAttemptsLimit'
  ]) {
    if (reward[key] !== undefined) {
      amount(key);
    }
  }

  return {
    ...data,
    stageIndex,
    reward: {
      ...reward,
      eliteDrop,
      damageDealt: amount('damageDealt'),
      bossHpBefore: amount('bossHpBefore'),
      bossHpAfter: amount('bossHpAfter'),
      stageCleared: reward.stageCleared
    }
  };
}
