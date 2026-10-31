import { exactInteger } from '../core/exact-json';
import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;
export type WorldBossUnit = { id: string; name: string; hp: number | bigint; maxHp: number | bigint; isDead: boolean; position: number };
export type WorldBossBattle = {
  winner: 'A' | 'B' | 'draw';
  totalRounds: number;
  finalState: { sideA: WorldBossUnit[]; sideB: WorldBossUnit[] };
};
export type WorldBossBattleSummary = {
  sideACount: number;
  sideBCount: number;
  totalDamageA: number | bigint;
  totalDamageB: number | bigint;
  totalHealsA: number | bigint;
  totalHealsB: number | bigint;
};
export type WorldBossRound = {
  damageDealt: number | bigint;
  totalPlayerDamage: number | bigint;
  attackCount: number;
  remainingAttempts: number;
  rank: number | null;
  battle: WorldBossBattle;
  battleSummary: WorldBossBattleSummary;
  logId: string;
  stageName: string;
  bossTitle: string;
  bossName: string;
};
export type WorldBossBatch = {
  stopReason?: string;
  rounds: WorldBossRound[];
  attemptsUsed: number;
  totalDamageDealt: number | bigint;
  lastRound: WorldBossRound;
  stageName: string;
  bossTitle: string;
  bossName: string;
  remainingAttempts: number;
};

function row(value: unknown, message: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
}
function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`凶兽挑战响应字段无效: ${field}`);
  }

  return value;
}
function text(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`凶兽挑战响应字段无效: ${field}`);
  }

  return value;
}
function unit(value: unknown): WorldBossUnit {
  const data = row(value, '凶兽战斗单位不完整');
  const hp = exactInteger(data.HP ?? data.hp);
  const maxHp = exactInteger(data.MaxHP ?? data.maxHp);
  const position = integer(data.Position ?? data.position, 'battle.position');
  const isDead = data.Dead ?? data.IsDead ?? data.isDead;

  if (typeof isDead !== 'boolean' || hp > maxHp) {
    throw new Error('凶兽战斗单位不完整');
  }

  return { id: text(data.ID ?? data.id, 'battle.id'), name: text(data.Name ?? data.name, 'battle.name'), hp, maxHp, isDead, position };
}
function battle(value: unknown): WorldBossBattle {
  const data = row(value, '凶兽战斗回执不完整');
  const winner = text(data.Winner ?? data.winner, 'battle.winner');
  const sideA = data.SideA ?? data.sideA;
  const sideB = data.SideB ?? data.sideB;

  if ((winner !== 'A' && winner !== 'B' && winner !== 'draw') || !Array.isArray(sideA) || !Array.isArray(sideB)) {
    throw new Error('凶兽战斗回执不完整');
  }

  return { winner, totalRounds: integer(data.Rounds ?? data.totalRounds, 'battle.rounds'), finalState: { sideA: sideA.map(unit), sideB: sideB.map(unit) } };
}
function battleSummary(value: unknown): WorldBossBattleSummary {
  const data = row(value, '凶兽战斗统计不完整');

  return {
    sideACount: integer(data.sideACount, 'battleSummary.sideACount'),
    sideBCount: integer(data.sideBCount, 'battleSummary.sideBCount'),
    totalDamageA: exactInteger(data.totalDamageA),
    totalDamageB: exactInteger(data.totalDamageB),
    totalHealsA: exactInteger(data.totalHealsA),
    totalHealsB: exactInteger(data.totalHealsB)
  };
}
function round(value: unknown): WorldBossRound {
  const data = row(value, '凶兽挑战回执不完整');
  const rank = data.rank;

  if (rank !== null && rank !== undefined && (typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 1)) {
    throw new Error('凶兽挑战回执不完整');
  }

  return {
    damageDealt: exactInteger(data.damageDealt),
    totalPlayerDamage: exactInteger(data.totalPlayerDamage),
    attackCount: integer(data.attackCount, 'attackCount'),
    remainingAttempts: integer(data.remainingAttempts, 'remainingAttempts'),
    rank: rank ?? null,
    battle: battle(data.battle),
    battleSummary: battleSummary(data.battleSummary),
    logId: text(data.logId, 'logId'),
    stageName: text(data.stageName, 'stageName'),
    bossTitle: text(data.bossTitle, 'bossTitle'),
    bossName: text(data.bossName, 'bossName')
  };
}
function valid(bid: string | undefined, uid: number): asserts bid is string {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('凶兽挑战参数无效');
  }
}
export async function challengeBackendWorldBoss(
  bid: string | undefined,
  uid: number,
  useAllAttempts: boolean,
  request?: BackendRequestContext
): Promise<WorldBossRound | WorldBossBatch> {
  valid(bid, uid);
  const operation = useAllAttempts ? 'post_players_id_world_boss_challenge_all' : 'post_players_id_world_boss_challenge';

  return parseWorldBossChallenge(
    await requestBackend(bid, operation, {
      headers: repeatPresentationHeaders('挑战凶兽'),
      path: { id: uid },
      body: {},
      ...writeContext(request)
    }),
    useAllAttempts
  );
}

export function parseWorldBossChallenge(value: unknown, useAllAttempts: boolean): WorldBossRound | WorldBossBatch {
  const data = row(value, '凶兽挑战响应不完整');

  if (!useAllAttempts) {
    return round(data);
  }
  if (!Array.isArray(data.rounds)) {
    throw new Error('凶兽批量挑战响应不完整');
  }

  return {
    ...(typeof data.stopReason === 'string' && data.stopReason ? { stopReason: data.stopReason } : {}),
    rounds: data.rounds.map(round),
    attemptsUsed: integer(data.attemptsUsed, 'attemptsUsed'),
    totalDamageDealt: exactInteger(data.totalDamageDealt),
    lastRound: round(data.lastRound),
    stageName: text(data.stageName, 'stageName'),
    bossTitle: text(data.bossTitle, 'bossTitle'),
    bossName: text(data.bossName, 'bossName'),
    remainingAttempts: integer(data.remainingAttempts, 'remainingAttempts')
  };
}
