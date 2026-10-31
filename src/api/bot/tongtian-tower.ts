import { requestBackend, writeContext } from './client';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;
export type BackendTongtianEntry = { rank: number; id: string; name: string; power: number; isFake: boolean; isMe: boolean };
export type BackendTongtianBattle = {
  winner: 'A' | 'B' | 'draw';
  rounds: number;
  sideA: Array<{ name: string; hp: number; maxHp: number; isDead: boolean }>;
  sideB: Array<{ name: string; hp: number; maxHp: number; isDead: boolean }>;
};
export type BackendTongtianChallenge = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  logId?: string;
  success: boolean;
  message: string;
  oldRank: number;
  newRank: number;
  rankImproved: boolean;
  experienceGained: number;
  baseExperience: number;
  experienceBonusText: string;
  reputationGained: number;
  battle: BackendTongtianBattle;
};
export type BackendTongtianView = {
  isOpen: boolean;
  message?: string;
  myRank: number;
  top3: BackendTongtianEntry[];
  nearby: BackendTongtianEntry[];
  challengeCost: number;
  challengeTip: string;
  rewardTip: string;
  sweepTargets: BackendTongtianEntry[];
};
export type BackendTongtianSweep = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  targetRank: number;
  sweepCount: number;
  qiSpent: number;
  experienceGained: number;
  baseExperience: number;
  experienceBonusText: string;
  reputationGained: number;
};
export type BackendTongtianBatchEvent = {
  index: number;
  targetRank?: number;
  outcome: string;
  message: string;
  displayText: string;
  logId?: string;
  needPotion: boolean;
  challenge?: BackendTongtianChallenge;
};
export type BackendTongtianBatch = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  startRank: number;
  finalRank: number;
  rounds: BackendTongtianChallenge[];
  winCount: number;
  lossCount: number;
  experienceGained: number;
  experienceBonusText: string;
  reputationGained: number;
  stopReason?: string;
  events: BackendTongtianBatchEvent[];
};

function row(value: unknown, message: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
}
function integer(value: unknown, field: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    throw new Error(`通天塔接口字段无效: ${field}`);
  }

  return value;
}
function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`通天塔接口字段无效: ${field}`);
  }

  return value;
}
function string(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`通天塔接口字段无效: ${field}`);
  }

  return value;
}
function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`通天塔接口字段无效: ${field}`);
  }

  return value;
}
function entry(value: unknown): BackendTongtianEntry {
  const data = row(value, '通天塔排名响应不完整');

  return {
    rank: integer(data.rank, 'rank', 1),
    id: string(data.id, 'id'),
    name: string(data.name, 'name'),
    power: integer(data.power, 'power'),
    isFake: bool(data.isFake, 'isFake'),
    isMe: bool(data.isMe, 'isMe')
  };
}
function unit(value: unknown): { name: string; hp: number; maxHp: number; isDead: boolean } {
  const data = row(value, '通天塔战斗单位响应不完整');

  return {
    name: string(data.Name ?? data.name, 'unit.name'),
    hp: integer(data.HP ?? data.hp, 'unit.hp'),
    maxHp: integer(data.MaxHP ?? data.maxHp, 'unit.maxHp', 1),
    isDead: bool(data.Dead ?? data.dead ?? data.IsDead ?? data.isDead, 'unit.isDead')
  };
}
function battle(value: unknown): BackendTongtianBattle {
  const data = row(value, '通天塔战斗响应不完整');
  const winner = string(data.Winner ?? data.winner, 'battle.winner');

  if (winner !== 'A' && winner !== 'B' && winner !== 'draw') {
    throw new Error('通天塔接口字段无效: battle.winner');
  }

  return {
    winner,
    rounds: integer(data.Rounds ?? data.rounds, 'battle.rounds'),
    sideA: array(data.SideA ?? data.sideA, 'battle.sideA').map(unit),
    sideB: array(data.SideB ?? data.sideB, 'battle.sideB').map(unit)
  };
}
export function parseTongtianChallenge(value: unknown): BackendTongtianChallenge {
  const data = row(value, '通天塔挑战响应不完整');

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    ...(typeof data.logId === 'string' ? { logId: data.logId } : {}),
    success: bool(data.success, 'success'),
    message: string(data.message, 'message'),
    oldRank: integer(data.oldRank, 'oldRank', 1),
    newRank: integer(data.newRank, 'newRank', 1),
    rankImproved: bool(data.rankImproved, 'rankImproved'),
    experienceGained: integer(data.experienceGained, 'experienceGained'),
    baseExperience: integer(data.baseExperience, 'baseExperience'),
    experienceBonusText: string(data.experienceBonusText, 'experienceBonusText'),
    reputationGained: integer(data.reputationGained, 'reputationGained'),
    battle: battle(data.battle)
  };
}
function requireParams(bid: string | undefined, uid: number): asserts bid is string {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('通天塔操作参数无效');
  }
}
export async function getBackendTongtianTower(bid: string | undefined, uid: number): Promise<BackendTongtianView> {
  requireParams(bid, uid);

  return parseTongtianTower(await requestBackend(bid, 'get_players_id_tongtian_tower', { path: { id: uid } }));
}

export function parseTongtianTower(value: unknown): BackendTongtianView {
  const data = row(value, '通天塔响应不完整');
  const isOpen = bool(data.isOpen, 'isOpen');
  const output: BackendTongtianView = {
    isOpen,
    myRank: integer(data.myRank, 'myRank', 1),
    top3: array(data.top3, 'top3').map(entry),
    nearby: array(data.nearby, 'nearby').map(entry),
    challengeCost: integer(data.challengeCost, 'challengeCost'),
    challengeTip: string(data.challengeTip, 'challengeTip'),
    rewardTip: string(data.rewardTip, 'rewardTip'),
    sweepTargets: array(data.sweepTargets, 'sweepTargets').map(entry)
  };

  if (typeof data.message === 'string') {
    output.message = data.message;
  }

  return output;
}
export async function challengeBackendTongtianTower(
  bid: string | undefined,
  uid: number,
  targetRank: number,
  request?: BackendRequestContext
): Promise<BackendTongtianChallenge> {
  requireParams(bid, uid);
  if (!Number.isSafeInteger(targetRank) || targetRank < 1 || targetRank > 1999) {
    throw new Error('目标排名无效');
  }

  return parseTongtianChallenge(
    await requestBackend(bid, 'post_players_id_tongtian_tower_challenges', {
      path: { id: uid },
      body: { targetRank },
      ...writeContext(request)
    })
  );
}
export async function sweepBackendTongtianTower(
  bid: string | undefined,
  uid: number,
  targetRank: number,
  count: number,
  request?: BackendRequestContext
): Promise<BackendTongtianSweep> {
  requireParams(bid, uid);

  return parseTongtianSweep(
    await requestBackend(bid, 'post_players_id_tongtian_tower_sweeps', { path: { id: uid }, body: { targetRank, count }, ...writeContext(request) })
  );
}

export function parseTongtianSweep(value: unknown): BackendTongtianSweep {
  const data = row(value, '通天塔扫荡响应不完整');

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    targetRank: integer(data.targetRank, 'targetRank', 1),
    sweepCount: integer(data.sweepCount, 'sweepCount', 1),
    qiSpent: integer(data.qiSpent, 'qiSpent'),
    experienceGained: integer(data.experienceGained, 'experienceGained'),
    baseExperience: integer(data.baseExperience, 'baseExperience'),
    experienceBonusText: string(data.experienceBonusText, 'experienceBonusText'),
    reputationGained: integer(data.reputationGained, 'reputationGained')
  };
}
export async function batchChallengeBackendTongtianTower(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<BackendTongtianBatch> {
  requireParams(bid, uid);

  return parseTongtianBatch(
    await requestBackend(bid, 'post_players_id_tongtian_tower_batch_challenges', { path: { id: uid }, body: {}, ...writeContext(request) })
  );
}

export function parseTongtianBatch(value: unknown): BackendTongtianBatch {
  const data = row(value, '通天塔连续挑战响应不完整');
  const events = array(data.events, 'events').map(value => {
    const event = row(value, '通天塔连续挑战事件不完整');
    const parsed: BackendTongtianBatchEvent = {
      index: integer(event.index, 'event.index', 1),
      outcome: string(event.outcome, 'event.outcome'),
      message: string(event.message, 'event.message'),
      displayText: string(event.displayText, 'event.displayText'),
      needPotion: bool(event.needPotion, 'event.needPotion')
    };

    if (event.targetRank !== undefined) {
      parsed.targetRank = integer(event.targetRank, 'event.targetRank', 1);
    }
    if (event.challenge !== undefined) {
      parsed.challenge = parseTongtianChallenge(event.challenge);
    }
    if (event.logId !== undefined) {
      parsed.logId = string(event.logId, 'event.logId');
    }

    return parsed;
  });
  const output: BackendTongtianBatch = {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    startRank: integer(data.startRank, 'startRank', 1),
    finalRank: integer(data.finalRank, 'finalRank', 1),
    rounds: array(data.rounds, 'rounds').map(parseTongtianChallenge),
    winCount: integer(data.winCount, 'winCount'),
    lossCount: integer(data.lossCount, 'lossCount'),
    experienceGained: integer(data.experienceGained, 'experienceGained'),
    experienceBonusText: string(data.experienceBonusText, 'experienceBonusText'),
    reputationGained: integer(data.reputationGained, 'reputationGained'),
    events
  };

  if (output.winCount + output.lossCount !== output.rounds.length) {
    throw new Error('通天塔连续挑战汇总响应不完整');
  }

  if (typeof data.stopReason === 'string') {
    output.stopReason = data.stopReason;
  }

  return output;
}
