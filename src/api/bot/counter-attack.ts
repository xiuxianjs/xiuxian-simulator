import { parseNamedBattleUnit, type NamedBattleUnit } from '../schemas/named-battle-unit';
import { parsePKReceipt, type PKReceipt } from './pk-receipt';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('反击响应不完整');
  }

  return value as Row;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`反击响应缺少${field}`);
  }

  return value;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`反击响应缺少${field}`);
  }

  return value;
}

function battleUnit(value: unknown): BackendCounterAttackUnit {
  const unit = parseNamedBattleUnit(value, '反击战斗单位响应不完整');

  if (!unit.name) {
    throw new Error('反击战斗单位响应不完整');
  }

  return unit;
}

export type BackendCounterAttackUnit = NamedBattleUnit;
export type BackendCounterAttack = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  pk?: PKReceipt;
  targetName: string;
  isWin: boolean;
  logId: string;
  totalRounds: number;
  sideA: BackendCounterAttackUnit[];
  sideB: BackendCounterAttackUnit[];
  counterHpCost: number;
  stoneReward: number;
  crystalReward: number;
  shaQiBonus: number;
  bonusText: string;
  expReward: number;
  droppedItem?: { name: string; quantity: number; category: string };
};

export async function counterAttackBackend(
  bid: string | undefined,
  uid: number,
  robberyLogId: number,
  request?: BackendRequestContext
): Promise<BackendCounterAttack> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(robberyLogId) || robberyLogId <= 0) {
    throw new Error('反击参数无效');
  }
  const result = await requestBackend(bid, 'post_counter_attacks_playerId_robberyLogId', {
    path: { playerId: uid, robberyLogId },
    ...writeContext(request)
  });

  return parseBackendCounterAttack(result);
}

export function parseBackendCounterAttack(result: unknown): BackendCounterAttack {
  const data = row(result);
  const pk = parsePKReceipt(data);

  if (
    pk &&
    (data.qiCost !== 0 ||
      data.stoneReward !== 0 ||
      data.crystalReward !== 0 ||
      !Number.isSafeInteger(data.experience) ||
      Number(data.experience) < 0 ||
      data.shaQiChange !== 0)
  ) {
    throw new Error('免费反击回执包含不应有的消耗或奖励');
  }
  const winner = data.winner ?? data.Winner;
  const battle = row(data.Battle ?? data.battle);
  const sideAValue = battle.SideA ?? battle.sideA;
  const sideBValue = battle.SideB ?? battle.sideB;

  if (
    typeof data.targetName !== 'string' ||
    typeof winner !== 'string' ||
    !['A', 'B'].includes(winner) ||
    typeof data.battleLogId !== 'string' ||
    typeof data.bonusText !== 'string' ||
    !Array.isArray(sideAValue) ||
    !Array.isArray(sideBValue)
  ) {
    throw new Error('反击响应不完整');
  }
  const dropped = data.droppedItem === undefined || data.droppedItem === null ? undefined : row(data.droppedItem);
  let droppedItem: BackendCounterAttack['droppedItem'];

  if (dropped) {
    if (typeof dropped.name !== 'string' || typeof dropped.category !== 'string') {
      throw new Error('反击掉落响应不完整');
    }
    droppedItem = { name: dropped.name, category: dropped.category, quantity: integer(dropped.quantity, 'droppedItem.quantity') };
  }

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
    targetName: data.targetName,
    isWin: pk?.won ?? winner === 'A',
    ...(pk ? { pk } : {}),
    logId: data.battleLogId,
    totalRounds: integer(battle.Rounds ?? battle.rounds, 'battle.rounds'),
    sideA: sideAValue.map(battleUnit),
    sideB: sideBValue.map(battleUnit),
    counterHpCost: integer(data.qiCost, 'qiCost'),
    stoneReward: integer(data.stoneReward, 'stoneReward'),
    crystalReward: integer(data.crystalReward, 'crystalReward'),
    shaQiBonus: finiteNumber(data.shaQiBonus, 'shaQiBonus'),
    bonusText: data.bonusText,
    expReward: integer(data.experience, 'experience'),
    droppedItem
  };
}
