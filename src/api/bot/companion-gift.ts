import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type CompanionGiftSettlement = {
  success: boolean;
  message: string;
  giftName: string;
  targetName: string;
  reply: string;
  intimacyGained: number;
  tongxinGained: number;
  premium: boolean;
};

const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export async function giveBackendCompanionGift(
  bid: string | undefined,
  uid: number,
  targetUserId: number,
  giftName: string,
  request?: BackendRequestContext
): Promise<CompanionGiftSettlement> {
  if (!bid) {
    throw new Error('赠礼请求缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_companion_gifts', {
    path: { id: uid },
    body: { targetUserId, giftName },
    ...writeContext(request)
  });

  return parseCompanionGiftSettlement(data);
}

export function parseCompanionGiftSettlement(data: unknown): CompanionGiftSettlement {
  if (
    !record(data) ||
    typeof data.success !== 'boolean' ||
    typeof data.message !== 'string' ||
    typeof data.giftName !== 'string' ||
    typeof data.targetName !== 'string' ||
    typeof data.reply !== 'string' ||
    !integer(data.intimacyGained) ||
    !integer(data.tongxinGained) ||
    typeof data.premium !== 'boolean'
  ) {
    throw new Error('赠礼结算响应不完整');
  }

  return {
    success: data.success,
    message: data.message,
    giftName: data.giftName,
    targetName: data.targetName,
    reply: data.reply,
    intimacyGained: data.intimacyGained,
    tongxinGained: data.tongxinGained,
    premium: data.premium
  };
}
