import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards } from '../schemas/issued-reward';

export type BackendAchievementClaim = { category: string; categoryLabel: string; achievementName: string; rewardText: string };
export type BackendAchievementClaimResult = { claimed: BackendAchievementClaim[]; claimedCount: number };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('成就领取响应不完整');
  }

  return value as Record<string, unknown>;
}

export function validateBackendAchievementClaim(value: unknown): BackendAchievementClaimResult {
  const row = record(value);

  if (typeof row.claimedCount !== 'number' || !Number.isSafeInteger(row.claimedCount) || row.claimedCount < 1 || !Array.isArray(row.claimed)) {
    throw new Error('成就领取响应不完整');
  }
  const claimed = row.claimed.map(value => {
    const item = record(value);

    if (
      typeof item.category !== 'string' ||
      typeof item.categoryLabel !== 'string' ||
      typeof item.achievementName !== 'string' ||
      !Array.isArray(item.issued)
    ) {
      throw new Error('成就领取响应不完整');
    }
    const rewardText = parsePositiveIssuedRewards(item.issued, '成就领取响应不完整')
      .map(reward => `${reward.name}×${reward.amount}`)
      .join('、');

    return { category: item.category, categoryLabel: item.categoryLabel, achievementName: item.achievementName, rewardText };
  });

  if (claimed.length !== row.claimedCount) {
    throw new Error('成就领取响应不完整');
  }

  return { claimed, claimedCount: row.claimedCount };
}

export async function claimBackendAchievementRewards(
  bid: string | undefined,
  uid: number,
  category: string,
  request?: BackendRequestContext
): Promise<BackendAchievementClaimResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return validateBackendAchievementClaim(
    await requestBackend(bid, 'post_players_id_achievements_claim', { path: { id: uid }, body: { category }, ...writeContext(request) })
  );
}
