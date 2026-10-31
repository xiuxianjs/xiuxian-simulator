import { parsePKReceipt } from './pk-receipt';
import { parseNormalExperienceGained, parseTreasureEffects } from './treasure-effects';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

const isSafeCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export async function robBackend(bid: string | undefined, uid: number, targetUid: number, request?: BackendRequestContext): Promise<any> {
  if (!bid) {
    throw new Error('打劫缺少平台身份');
  }

  const result = await requestBackend(bid, 'post_robbery_playerId_targetId', {
    path: { playerId: uid, targetId: targetUid },
    body: {},
    ...writeContext(request)
  });

  return parseBackendRobbery(result);
}

export function parseBackendRobbery(result: unknown): any {
  if (typeof result !== 'object' || result === null) {
    throw new Error('服务端打劫回执缺少有效次数或元力信息');
  }
  const receipt = result as Record<string, unknown>;

  if (
    !isSafeCount(receipt.qiCost) ||
    !isSafeCount(receipt.remaining) ||
    !isSafeCount(receipt.dailyMax) ||
    receipt.qiCost < 0 ||
    receipt.remaining < 0 ||
    receipt.dailyMax <= 0 ||
    receipt.remaining > receipt.dailyMax ||
    typeof receipt.bonusText !== 'string' ||
    typeof receipt.losingStreakText !== 'string'
  ) {
    throw new Error('服务端打劫回执缺少有效次数或元力信息');
  }

  parsePKReceipt(receipt);
  parseTreasureEffects(receipt.treasureEffects);
  parseNormalExperienceGained(receipt.normalExperienceGained);

  return result;
}
