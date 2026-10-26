import { formatGameDate } from '@src/utils/gameTime';
export type PublicTribulationEvent = {
  eventId: number;
  playerId: number;
  name: string;
  currentRealm: string;
  targetRealm: string;
  targetStage: number;
  tribulationName: string;
  requiredAttempts: number;
  status: 'opened' | 'preparing' | 'charging' | 'succeeded' | 'failed' | 'expired' | 'cancelled' | 'evaded';
  opensAt: string;
  deadline?: string;
  strikeAt?: string;
  participationOpen?: boolean;
  interactionOpen: boolean;
  disruptionKarmaEnabled?: boolean;
  disruption?: { count: number; attackBonusPercent: number };
  canStart: false;
};
export type PublicTribulationQuery = { playerId?: number; name?: string; targetStage?: number; offset?: number; limit?: number };

export function parsePublicTribulationEvent(data: unknown): PublicTribulationEvent {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('公开渡劫接口返回不完整');
  }
  const value = data as Record<string, unknown>;
  const positive = (key: string) => Number.isSafeInteger(value[key]) && Number(value[key]) > 0;

  if (
    !['eventId', 'playerId', 'targetStage', 'requiredAttempts'].every(positive) ||
    !['name', 'currentRealm', 'targetRealm', 'tribulationName'].every(key => typeof value[key] === 'string') ||
    !(value.status === 'opened' ? ['opensAt'] : ['opensAt', 'deadline']).every(
      key => typeof value[key] === 'string' && Number.isFinite(Date.parse(value[key]))
    ) ||
    typeof value.status !== 'string' ||
    !['opened', 'preparing', 'charging', 'succeeded', 'failed', 'expired', 'cancelled', 'evaded'].includes(value.status) ||
    typeof value.interactionOpen !== 'boolean' ||
    (value.disruptionKarmaEnabled !== undefined && typeof value.disruptionKarmaEnabled !== 'boolean') ||
    (value.interactionOpen && value.status !== 'charging') ||
    (value.status === 'charging' && (typeof value.strikeAt !== 'string' || !Number.isFinite(Date.parse(value.strikeAt)))) ||
    value.canStart !== false
  ) {
    throw new Error('公开渡劫接口返回不完整或包含未支持的互动状态');
  }

  // Rebuild the public projection instead of forwarding unreviewed fields.
  return {
    eventId: value.eventId as number,
    playerId: value.playerId as number,
    name: value.name as string,
    currentRealm: value.currentRealm as string,
    targetRealm: value.targetRealm as string,
    targetStage: value.targetStage as number,
    tribulationName: value.tribulationName as string,
    requiredAttempts: value.requiredAttempts as number,
    status: value.status as PublicTribulationEvent['status'],
    opensAt: value.opensAt as string,
    ...(value.deadline !== undefined ? { deadline: value.deadline as string } : {}),
    ...(value.strikeAt !== undefined ? { strikeAt: value.strikeAt as string } : {}),
    ...(value.participationOpen === true && value.interactionOpen === true ? { participationOpen: true } : {}),
    interactionOpen: value.interactionOpen,
    ...(value.disruptionKarmaEnabled === true ? { disruptionKarmaEnabled: true } : {}),
    ...(value.disruption !== undefined ? { disruption: parseDisruptionSummary(value.disruption) } : {}),
    canStart: false
  };
}
export function parsePublicTribulationList(data: unknown): PublicTribulationEvent[] {
  if (!Array.isArray(data)) {
    throw new Error('公开渡劫列表返回不完整');
  }

  return data.map(parsePublicTribulationEvent);
}

export function parseDisruptionSummary(data: unknown): { count: number; attackBonusPercent: number } {
  if (!data || typeof data !== 'object') {
    throw new Error('捣乱数据不完整');
  }
  const v = data as Record<string, unknown>;

  if (
    !Number.isSafeInteger(v.count) ||
    Number(v.count) < 0 ||
    !Number.isSafeInteger(v.attackBonusPercent) ||
    Number(v.attackBonusPercent) !== Math.min(Number(v.count), 10)
  ) {
    throw new Error('捣乱数据不完整');
  }

  return { count: Number(v.count), attackBonusPercent: Number(v.attackBonusPercent) };
}
export type TribulationDisruptionResult = {
  eventId: number;
  participated: true;
  summary: { count: number; attackBonusPercent: number };
  reward?: TribulationParticipationReward;
};
export function parseDisruptionResult(data: unknown, eventId: number): TribulationDisruptionResult {
  if (!data || typeof data !== 'object') {
    throw new Error('捣乱结果不完整');
  }
  const v = data as Record<string, unknown>;

  if (v.eventId !== eventId || v.participated !== true) {
    throw new Error('捣乱事件不一致');
  }

  return {
    eventId,
    participated: true,
    summary: parseDisruptionSummary(v.summary),
    ...(v.reward !== undefined ? { reward: parseParticipationReward(v.reward) } : {})
  };
}

export type TribulationParticipationReward = {
  baseExperience: number;
  creditedExperience: number;
  dailyRewarded: number;
  dailyLimit: number;
  rewardDate: string;
  reason: 'granted' | 'daily_limit' | 'experience_cap' | 'no_eligible_dungeon';
  repeated: boolean;
};
export type TribulationParticipationResult = { eventId: number; participated: true; reward: TribulationParticipationReward };
export function parseParticipationReward(data: unknown): TribulationParticipationReward {
  if (!data || typeof data !== 'object') {
    throw new Error('渡劫感悟回执不完整');
  }
  const v = data as Record<string, unknown>;

  if (
    !['baseExperience', 'creditedExperience', 'dailyRewarded', 'dailyLimit'].every(k => Number.isSafeInteger(v[k]) && Number(v[k]) >= 0) ||
    v.dailyLimit !== 3 ||
    Number(v.dailyRewarded) > Number(v.dailyLimit) ||
    Number(v.creditedExperience) > Number(v.baseExperience) ||
    typeof v.rewardDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.rewardDate) ||
    typeof v.repeated !== 'boolean' ||
    !['granted', 'daily_limit', 'experience_cap', 'no_eligible_dungeon'].includes(String(v.reason)) ||
    (v.reason === 'granted' ? Number(v.creditedExperience) <= 0 : v.creditedExperience !== 0)
  ) {
    throw new Error('渡劫感悟回执不完整');
  }

  return {
    baseExperience: Number(v.baseExperience),
    creditedExperience: Number(v.creditedExperience),
    dailyRewarded: Number(v.dailyRewarded),
    dailyLimit: Number(v.dailyLimit),
    rewardDate: v.rewardDate,
    reason: v.reason as TribulationParticipationReward['reason'],
    repeated: v.repeated
  };
}
export function parseParticipationResult(data: unknown, eventId: number): TribulationParticipationResult {
  if (!data || typeof data !== 'object') {
    throw new Error('渡劫参与回执不完整');
  }
  const v = data as Record<string, unknown>;

  if (v.eventId !== eventId || v.participated !== true) {
    throw new Error('渡劫参与事件不一致');
  }

  return { eventId, participated: true, reward: parseParticipationReward(v.reward) };
}
export function participationRewardLines(r: TribulationParticipationReward): string[] {
  const line =
    r.reason === 'granted'
      ? r.repeated
        ? `本场已获得修为 +${r.creditedExperience}，本次未重复发放。`
        : `参与感悟：修为 +${r.creditedExperience}，已即时到账。`
      : r.reason === 'daily_limit'
        ? '本次未获修为：当日3场奖励已领满，仍可参与。'
        : r.reason === 'experience_cap'
          ? '本次未获修为：已达当前境界修为存储上限。'
          : '本次未获修为：本场暂无可获得的感悟修为。';

  return [line, `今日感悟 ${r.dailyRewarded}/${r.dailyLimit}场 · ${formatGameDate(r.rewardDate)}`];
}
