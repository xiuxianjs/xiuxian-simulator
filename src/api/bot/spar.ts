import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend } from './client';

export type SparBackendResult = {
  settledCount?: number;
  battleView: {
    totalRounds: number;
    finalState: { sideA: SparBattleUnit[]; sideB: SparBattleUnit[] };
  };
  battleLogId: string;
  winner: 'A' | 'B';
  baseExperience: number;
  experience: number;
  expBonusText: string;
  qiCost: number;
  dailyMax: number;
  newCount: number;
  proficiencyResult: { gained: boolean; points: number };
};

export type SparBattleUnit = { id: string; name: string; hp: number; maxHp: number; isDead: boolean; position: number };

const row = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('比试响应不完整');
  }

  return value as Record<string, unknown>;
};

const integer = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('比试响应不完整');
  }

  return value;
};

const unit = (value: unknown): SparBattleUnit => {
  const valueRow = row(value);

  if (typeof valueRow.id !== 'string' || typeof valueRow.name !== 'string' || typeof valueRow.isDead !== 'boolean') {
    throw new Error('比试响应不完整');
  }
  const hp = integer(valueRow.hp);
  const maxHp = integer(valueRow.maxHp);
  const position = integer(valueRow.position);

  if (position < 1 || hp > maxHp) {
    throw new Error('比试响应不完整');
  }

  return { id: valueRow.id, name: valueRow.name, hp, maxHp, isDead: valueRow.isDead, position };
};

function parseSparResult(value: unknown): SparBackendResult {
  const result = row(value);
  const battleView = row(result.battleView);
  const finalState = row(battleView.finalState);
  const proficiencyResult = row(result.proficiencyResult);

  if (
    !Array.isArray(finalState.sideA) ||
    !Array.isArray(finalState.sideB) ||
    typeof result.battleLogId !== 'string' ||
    (result.winner !== 'A' && result.winner !== 'B') ||
    typeof result.expBonusText !== 'string' ||
    typeof proficiencyResult.gained !== 'boolean'
  ) {
    throw new Error('比试响应不完整');
  }

  return {
    ...(result.settledCount === undefined ? {} : { settledCount: integer(result.settledCount) }),
    battleView: { totalRounds: integer(battleView.totalRounds), finalState: { sideA: finalState.sideA.map(unit), sideB: finalState.sideB.map(unit) } },
    battleLogId: result.battleLogId,
    winner: result.winner,
    baseExperience: integer(result.baseExperience),
    experience: integer(result.experience),
    expBonusText: result.expBonusText,
    qiCost: integer(result.qiCost),
    dailyMax: integer(result.dailyMax),
    newCount: integer(result.newCount),
    proficiencyResult: { gained: proficiencyResult.gained, points: integer(proficiencyResult.points) }
  };
}

export async function commandBackendSpar(bid: string | undefined, uid: number, targetUid: number, targetBid?: string, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('比试缺少平台身份');
  }

  return parseBackendSparCommand(
    await requestBackend(bid, 'post_players_id_spar_command', {
      path: { id: uid },
      body: { targetUid, ...(targetBid ? { targetBid } : {}) },
      headers: repeatPresentationHeaders('比试'),
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    })
  );
}

export function parseBackendSparCommand(value: unknown) {
  const data = row(value);

  if (typeof data.allowed !== 'boolean' || typeof data.realmName !== 'string') {
    throw new Error('比试响应不完整');
  }

  return {
    allowed: data.allowed,
    realmName: data.realmName,
    targetUid: integer(data.targetUid),
    battle: data.battle === null ? null : parseSparResult(data.battle)
  };
}

export function parseRobotSpar(value: unknown) {
  const command = parseBackendSparCommand(value);

  if (!command.allowed || !command.targetUid || !command.battle) {
    throw new Error('比试响应不完整');
  }
  const result = command.battle;

  return {
    settledCount: result.settledCount ?? 1,
    experience: result.experience,
    battleResult: { ...result.battleView, totalWaves: 1, winner: result.winner },
    targetUid: command.targetUid,
    logId: result.battleLogId,
    hpCost: result.qiCost,
    dailyMax: result.dailyMax,
    newCount: result.newCount,
    expGain: result.baseExperience,
    expBonusText: result.expBonusText,
    proficiencyResult: result.proficiencyResult
  };
}
