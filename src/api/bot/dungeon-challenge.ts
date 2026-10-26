import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { logger } from 'alemonjs';

export type BackendDungeonChallenge = {
  dungeonId: number;
  won: boolean;
  experienceGained: number;
  spiritStoneGained: number;
  logId?: string;
  battle: { winner: 'A' | 'B' | 'draw'; rounds: number };
  drops: Array<{ category: string; amount: number; currencyCode?: string; itemId?: number }>;
  rewardsByUser: Array<{
    userId: number;
    eligible: boolean;
    noRewardReason?: string;
    spiritCostPaid: number;
    experienceGained: number;
    currency: Array<{ category: string; name: string; amount: number }>;
    items: Array<{ category: string; name: string; amount: number }>;
    firstClear?: Array<{ category: string; name: string; amount: number }>;
  }>;
};
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const battleWinner = (value: unknown): value is BackendDungeonChallenge['battle']['winner'] => typeof value === 'string' && ['A', 'B', 'draw'].includes(value);
const rewards = (value: unknown): BackendDungeonChallenge['rewardsByUser'] => {
  if (!Array.isArray(value)) {
    throw new Error('秘境挑战结算响应不完整');
  }

  return value.map(row => {
    if (
      !record(row) ||
      !integer(row.userId) ||
      typeof row.eligible !== 'boolean' ||
      !integer(row.spiritCostPaid) ||
      !integer(row.experienceGained) ||
      (row.noRewardReason !== undefined && typeof row.noRewardReason !== 'string')
    ) {
      throw new Error('秘境挑战成员结算响应不完整');
    }
    const rewardList = (raw: unknown) => {
      if (!Array.isArray(raw)) {
        throw new Error('秘境挑战奖励响应不完整');
      }

      return raw.map(item => {
        if (!record(item) || typeof item.category !== 'string' || typeof item.name !== 'string' || !integer(item.amount)) {
          throw new Error('秘境挑战奖励明细不完整');
        }

        return { category: item.category, name: item.name, amount: item.amount };
      });
    };

    return {
      userId: row.userId,
      eligible: row.eligible,
      ...(typeof row.noRewardReason === 'string' ? { noRewardReason: row.noRewardReason } : {}),
      spiritCostPaid: row.spiritCostPaid,
      experienceGained: row.experienceGained,
      currency: rewardList(row.currency),
      items: rewardList(row.items),
      ...(row.firstClear === undefined ? {} : { firstClear: rewardList(row.firstClear) })
    };
  });
};

export async function challengeBackendDungeon(
  bid: string | undefined,
  uid: number,
  dungeonName: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendDungeonChallenge> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !dungeonName.trim()) {
    throw new Error('秘境挑战请求参数无效');
  }
  const value = await requestBackend(bid, 'post_players_id_dungeons_challenge', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    body: { dungeonName },
    ...writeContext(request)
  });

  return parseDungeonChallenge(value, request);
}

export function parseDungeonChallenge(value: unknown, request?: BackendRequestContext): BackendDungeonChallenge {
  const battle = record(value) && record(value.battle) ? value.battle : undefined;
  const winner = battle?.Winner ?? battle?.winner;
  const rounds = battle?.Rounds ?? battle?.rounds;

  const invalidFields = !record(value)
    ? ['data']
    : [
        ...(!integer(value.dungeonId) ? ['dungeonId'] : []),
        ...(typeof value.won !== 'boolean' ? ['won'] : []),
        ...(!integer(value.experienceGained) ? ['experienceGained'] : []),
        ...(!integer(value.spiritStoneGained) ? ['spiritStoneGained'] : []),
        ...(!battle ? ['battle'] : []),
        ...(!battleWinner(winner) ? ['battle.Winner/winner'] : []),
        ...(!integer(rounds) ? ['battle.Rounds/rounds'] : []),
        ...(!Array.isArray(value.drops) ? ['drops'] : []),
        ...(value.logId !== undefined && typeof value.logId !== 'string' ? ['logId'] : [])
      ];

  if (
    !record(value) ||
    !integer(value.dungeonId) ||
    typeof value.won !== 'boolean' ||
    !integer(value.experienceGained) ||
    !integer(value.spiritStoneGained) ||
    !battleWinner(winner) ||
    !integer(rounds) ||
    !Array.isArray(value.drops) ||
    (value.logId !== undefined && typeof value.logId !== 'string')
  ) {
    // The request may already have settled. Log only field names, never the
    // player payload, so the deployed contract mismatch can be traced safely.
    logger.error('[秘境挑战响应校验失败]', { requestId: request?.requestId, invalidFields });
    throw new Error('秘境挑战响应不完整', { cause: { invalidFields } });
  }
  const drops = value.drops.map(drop => {
    if (
      !record(drop) ||
      typeof drop.category !== 'string' ||
      !integer(drop.amount) ||
      (drop.currencyCode !== undefined && typeof drop.currencyCode !== 'string') ||
      (drop.itemId !== undefined && !integer(drop.itemId))
    ) {
      throw new Error('秘境挑战掉落响应不完整');
    }

    return {
      category: drop.category,
      amount: drop.amount,
      ...(typeof drop.currencyCode === 'string' ? { currencyCode: drop.currencyCode } : {}),
      ...(integer(drop.itemId) ? { itemId: drop.itemId } : {})
    };
  });

  return {
    dungeonId: value.dungeonId,
    won: value.won,
    experienceGained: value.experienceGained,
    spiritStoneGained: value.spiritStoneGained,
    ...(typeof value.logId === 'string' && value.logId ? { logId: value.logId } : {}),
    battle: { winner, rounds },
    drops,
    rewardsByUser: rewards(value.rewardsByUser)
  };
}
