import { parseNamedBattleUnit, type NamedBattleUnit } from '../schemas/named-battle-unit';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;

const row = (value: unknown): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('悬赏接口响应不完整');
  }

  return value as Row;
};

const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const nonnegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export type BackendPublishedBounty = {
  bountyId: number;
  totalCost: number;
  fee: number;
  rewardPool: number;
  rewardPerPerson: number;
  maxCompletions: number;
  targetName: string;
  validHours: number;
};

export type BackendBountyPublishPolicy = {
  maxAmount: number;
  minPerPerson: number;
  minCompletions: number;
  maxCompletions: number;
  defaultCompletions: number;
  feePercent: number;
  validHours: number;
};

export async function getBackendBountyPublishPolicy(bid: string | undefined): Promise<BackendBountyPublishPolicy> {
  if (!bid?.trim()) {
    throw new Error('悬赏规则查询缺少平台身份');
  }

  return parseBackendBountyPublishPolicy(await requestBackend(bid, 'get_bounties_publish_policy'));
}

export function parseBackendBountyPublishPolicy(value: unknown): BackendBountyPublishPolicy {
  const data = row(value);

  for (const field of ['maxAmount', 'minPerPerson', 'minCompletions', 'maxCompletions', 'defaultCompletions', 'feePercent', 'validHours']) {
    if (!positiveInteger(data[field])) {
      throw new Error('悬赏发布规则响应不完整');
    }
  }

  return data as BackendBountyPublishPolicy;
}

export async function publishBackendBounty(
  bid: string | undefined,
  uid: number,
  targetId: number,
  amount: number,
  maxCompletions: number | undefined,
  request?: BackendRequestContext
): Promise<BackendPublishedBounty> {
  if (
    !bid?.trim() ||
    ![uid, targetId].every(positiveInteger) ||
    !Number.isSafeInteger(amount) ||
    (maxCompletions !== undefined && !Number.isSafeInteger(maxCompletions))
  ) {
    throw new Error('悬赏参数无效');
  }

  return parseBackendPublishedBounty(
    await requestBackend(bid, 'post_players_id_bounties', {
      path: { id: uid },
      body: { targetId, amount, ...(maxCompletions === undefined ? {} : { maxCompletions }) },
      ...writeContext(request)
    })
  );
}

export function parseBackendPublishedBounty(value: unknown): BackendPublishedBounty {
  const data = row(value);

  if (
    !positiveInteger(data.id) ||
    !integer(data.totalCost) ||
    !integer(data.fee) ||
    !integer(data.rewardPool) ||
    !integer(data.rewardPerCompletion) ||
    !integer(data.maxCompletions) ||
    typeof data.targetName !== 'string' ||
    !positiveInteger(data.validHours)
  ) {
    throw new Error('悬赏发布响应不完整');
  }

  return {
    bountyId: data.id,
    totalCost: data.totalCost,
    fee: data.fee,
    rewardPool: data.rewardPool,
    rewardPerPerson: data.rewardPerCompletion,
    maxCompletions: data.maxCompletions,
    targetName: data.targetName,
    validHours: data.validHours
  };
}

export type BackendBountyClaim = { rewardAmount: number };
export async function claimBackendBounty(bid: string | undefined, bountyId: number, request?: BackendRequestContext): Promise<BackendBountyClaim> {
  if (!bid?.trim() || !positiveInteger(bountyId)) {
    throw new Error('领赏参数无效');
  }
  const data = row(await requestBackend(bid, 'post_bounties_bountyId_claim', { path: { bountyId }, ...writeContext(request) }));

  if (data.code !== 'SPIRIT_CRYSTAL' || !positiveInteger(data.changeAmount)) {
    throw new Error('领赏响应不完整');
  }

  return { rewardAmount: data.changeAmount };
}

export type BackendPendingBountyReward = { bountyId: number; targetName: string; rewardAmount: number };
export async function getBackendPendingBountyRewards(bid: string | undefined, uid: number): Promise<BackendPendingBountyReward[]> {
  if (!bid?.trim() || !positiveInteger(uid)) {
    throw new Error('待领赏金参数无效');
  }
  const data = await requestBackend(bid, 'get_players_id_bounties_pending_rewards', { path: { id: uid } });

  return parseBackendPendingBountyRewards(data);
}

export function parseBackendPendingBountyRewards(data: unknown): BackendPendingBountyReward[] {
  if (!Array.isArray(data)) {
    throw new Error('待领赏金响应不完整');
  }

  return data.map(value => {
    const item = row(value);

    if (!positiveInteger(item.bountyId) || typeof item.targetName !== 'string' || !positiveInteger(item.rewardAmount)) {
      throw new Error('待领赏金响应不完整');
    }

    return { bountyId: item.bountyId, targetName: item.targetName, rewardAmount: item.rewardAmount };
  });
}

export type BackendBountyBattleUnit = NamedBattleUnit;
export type BackendBountyAccept = {
  battleWon: boolean;
  completionId?: number;
  logId?: string;
  bountyReward?: number;
  stoneReward?: number;
  crystalReward?: number;
  droppedItem?: { category: string; name: string; quantity: number };
  expReward: number;
  streak: number;
  streakBonus: number;
  shaQiBonus: number;
  bonusText: string;
  losingStreakText: string;
  targetName: string;
  qiCost: number;
  remainingCount: number;
  dailyAcceptLimit: number;
  battleResult: { totalRounds: number; finalState: { sideA: BackendBountyBattleUnit[]; sideB: BackendBountyBattleUnit[] } };
};

const battleUnit = (value: unknown): BackendBountyBattleUnit => parseNamedBattleUnit(value, '接赏战斗单位响应不完整');

export async function acceptBackendBounty(bid: string | undefined, bountyId: number, request: BackendRequestContext): Promise<BackendBountyAccept> {
  if (!bid?.trim() || !positiveInteger(bountyId)) {
    throw new Error('接赏参数无效');
  }

  return parseBackendBountyAccept(await requestBackend(bid, 'post_bounties_bountyId_accept', { path: { bountyId }, ...writeContext(request) }));
}

export function parseBackendBountyAccept(value: unknown): BackendBountyAccept {
  const data = row(value);

  if (
    typeof data.battleWon !== 'boolean' ||
    typeof data.targetName !== 'string' ||
    !nonnegativeInteger(data.qiCost) ||
    !nonnegativeInteger(data.remainingCount) ||
    !positiveInteger(data.dailyAcceptLimit) ||
    data.remainingCount > data.dailyAcceptLimit ||
    !integer(data.expReward) ||
    !integer(data.streak) ||
    !finiteNumber(data.streakBonus) ||
    !finiteNumber(data.shaQiBonus) ||
    typeof data.bonusText !== 'string' ||
    typeof data.losingStreakText !== 'string'
  ) {
    throw new Error('接赏响应不完整');
  }
  const battle = row(data.battle);

  if (!integer(battle.Rounds) || !Array.isArray(battle.SideA) || !Array.isArray(battle.SideB)) {
    throw new Error('接赏战斗响应不完整');
  }
  if (
    (data.completionId !== undefined && !positiveInteger(data.completionId)) ||
    (data.logId !== undefined && typeof data.logId !== 'string') ||
    !['bountyReward', 'stoneReward', 'crystalReward'].every(field => data[field] === undefined || integer(data[field]))
  ) {
    throw new Error('接赏响应不完整');
  }
  const completionId = positiveInteger(data.completionId) ? data.completionId : undefined;
  const logId = typeof data.logId === 'string' && data.logId ? data.logId : undefined;
  const dropped = data.droppedItem === undefined ? undefined : row(data.droppedItem);
  let droppedItem: BackendBountyAccept['droppedItem'];

  if (dropped) {
    if (typeof dropped.category !== 'string' || typeof dropped.name !== 'string' || !positiveInteger(dropped.quantity)) {
      throw new Error('接赏掉落响应不完整');
    }
    droppedItem = { category: dropped.category, name: dropped.name, quantity: dropped.quantity };
  }

  return {
    battleWon: data.battleWon,
    completionId,
    logId,
    bountyReward: integer(data.bountyReward) ? data.bountyReward : undefined,
    stoneReward: integer(data.stoneReward) ? data.stoneReward : undefined,
    crystalReward: integer(data.crystalReward) ? data.crystalReward : undefined,
    droppedItem,
    expReward: data.expReward,
    streak: data.streak,
    streakBonus: data.streakBonus,
    shaQiBonus: data.shaQiBonus,
    bonusText: data.bonusText,
    losingStreakText: data.losingStreakText,
    targetName: data.targetName,
    qiCost: data.qiCost,
    remainingCount: data.remainingCount,
    dailyAcceptLimit: data.dailyAcceptLimit,
    battleResult: { totalRounds: battle.Rounds, finalState: { sideA: battle.SideA.map(battleUnit), sideB: battle.SideB.map(battleUnit) } }
  };
}

export function parseRobotBountyClaim(
  value: unknown
): { outcome: 'list'; pending: BackendPendingBountyReward[] } | { outcome: 'claimed'; rewardAmount: number } {
  const data = row(value);

  if (data.outcome === 'list') {
    return { outcome: 'list', pending: parseBackendPendingBountyRewards(data.pending) };
  }
  if (data.outcome === 'claimed' && positiveInteger(data.rewardAmount)) {
    return { outcome: 'claimed', rewardAmount: data.rewardAmount };
  }
  throw new Error('领赏响应不完整');
}

export function parseRobotBountyPublish(
  value: unknown
): { outcome: 'policy'; policy: BackendBountyPublishPolicy } | { outcome: 'published'; data: BackendPublishedBounty } {
  const data = row(value);

  if (data.outcome === 'policy') {
    return { outcome: 'policy', policy: parseBackendBountyPublishPolicy(data.policy) };
  }
  if (data.outcome === 'published') {
    return { outcome: 'published', data: parseBackendPublishedBounty(data.data) };
  }
  throw new Error('悬赏发布响应不完整');
}

/** The existing accepted-bounty challenge receipt; no synthetic completion IDs. */
export function parseRobotBountyChallenge(value: unknown) {
  const data = row(value);
  const battle = row(data.battle);

  if (
    typeof data.won !== 'boolean' ||
    !integer(data.experienceGained) ||
    !nonnegativeInteger(data.rewardAmount) ||
    !nonnegativeInteger(data.qiCost) ||
    !nonnegativeInteger(data.remainingCount) ||
    !positiveInteger(data.dailyAcceptLimit) ||
    data.remainingCount > data.dailyAcceptLimit ||
    !nonnegativeInteger(battle.Rounds) ||
    !Array.isArray(battle.SideA) ||
    !Array.isArray(battle.SideB) ||
    (data.logId !== undefined && typeof data.logId !== 'string')
  ) {
    throw new Error('继续接赏响应不完整');
  }

  return {
    won: data.won,
    experienceGained: data.experienceGained,
    rewardAmount: data.rewardAmount,
    qiCost: data.qiCost,
    remainingCount: data.remainingCount,
    dailyAcceptLimit: data.dailyAcceptLimit,
    logId: typeof data.logId === 'string' && data.logId ? data.logId : undefined,
    battle: { rounds: battle.Rounds, sideA: battle.SideA.map(battleUnit), sideB: battle.SideB.map(battleUnit) }
  };
}
