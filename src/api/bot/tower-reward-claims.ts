import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

type ClaimResult = { claimedCount?: number; ranking?: number; rewardTexts: string[] };

export function parseTowerRewardClaim(value: unknown, required: 'claimedCount' | 'ranking'): ClaimResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('排名奖励结算响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (!Array.isArray(row.rewardTexts) || !row.rewardTexts.every(text => typeof text === 'string')) {
    throw new Error('排名奖励结算响应不完整');
  }
  for (const field of ['claimedCount', 'ranking'] as const) {
    const value = row[field];

    if (field !== required && value === undefined) {
      continue;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
      throw new Error('排名奖励结算响应不完整');
    }
  }

  return row as unknown as ClaimResult;
}

export async function claimBackendFirstRewards(bid: string, uid: number, ranking: number | 'all', request?: BackendRequestContext): Promise<ClaimResult> {
  const context = writeContext(request);

  if (ranking === 'all') {
    return parseTowerRewardClaim(
      await requestBackend(bid, 'post_players_id_tower_rank_rewards_first_claim_all', {
        headers: repeatPresentationHeaders('领取首通奖励'),
        path: { id: uid },
        ...context
      }),
      'claimedCount'
    );
  }

  return parseTowerRewardClaim(
    await requestBackend(bid, 'post_players_id_tower_rank_rewards_first_ranking_claim', {
      headers: repeatPresentationHeaders('领取首通奖励'),
      path: { id: uid, ranking },
      ...context
    }),
    'ranking'
  );
}

export async function claimBackendMonthlyRewards(
  bid: string,
  uid: number,
  rewardId: number | 'all',
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ClaimResult> {
  const context = writeContext(request);
  const body = rewardId === 'all' ? {} : { rewardId };

  return parseTowerRewardClaim(
    await requestBackend(bid, 'post_players_id_tower_rank_rewards_monthly_claim', {
      headers: repeatPresentationHeaders(repeatCommand),
      path: { id: uid },
      body,
      ...context
    }),
    'claimedCount'
  );
}
