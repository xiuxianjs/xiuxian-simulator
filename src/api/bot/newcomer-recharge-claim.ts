import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { NewcomerRechargeClaimData } from '../schemas/newcomer-recharge-claim';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('新人返利领取响应不完整');
  }

  return value as Record<string, unknown>;
}

export function parseBackendNewcomerRechargeClaim(value: unknown): NewcomerRechargeClaimData {
  const row = record(value);
  const reward = record(row.reward);

  if (
    !Number.isSafeInteger(row.dayIndex) ||
    Number(row.dayIndex) < 1 ||
    Number(row.dayIndex) > 14 ||
    !Number.isSafeInteger(reward.spiritStone) ||
    !Number.isSafeInteger(reward.spiritCrystal) ||
    !Number.isSafeInteger(reward.spiritMilk) ||
    typeof reward.itemIds !== 'string' ||
    typeof row.rewardText !== 'string' ||
    !row.itemNames ||
    typeof row.itemNames !== 'object' ||
    Array.isArray(row.itemNames) ||
    !Object.values(row.itemNames).every(name => typeof name === 'string')
  ) {
    throw new Error('新人返利领取响应不完整');
  }
  const dayIndex = row.dayIndex as number;
  const spiritStone = reward.spiritStone as number;
  const spiritCrystal = reward.spiritCrystal as number;
  const spiritMilk = reward.spiritMilk as number;

  return {
    dayIndex,
    reward: { spiritStone, spiritCrystal, spiritMilk, itemIds: reward.itemIds },
    itemNames: row.itemNames as Record<number, string>,
    rewardText: row.rewardText
  };
}

export async function claimBackendNewcomerRechargeDay(
  bid: string | undefined,
  uid: number,
  dayIndex: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<NewcomerRechargeClaimData> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(dayIndex) || dayIndex < 1 || dayIndex > 14) {
    throw new Error('新人返利领取参数无效');
  }

  return parseBackendNewcomerRechargeClaim(
    await requestBackend(bid, 'post_players_id_recharge_newcomer_claim', {
      headers: repeatPresentationHeaders(repeatCommand),
      path: { id: uid },
      body: { dayIndex },
      ...writeContext(request)
    })
  );
}
