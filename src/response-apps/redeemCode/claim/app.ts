/** 礼包码兑换：机器人只解析输入、调用 Go 并展示服务端结果。 */
import { isBackendNotFound, redeemBackendExternalGiftCode, redeemBackendGiftCode } from '@src/api/bot/gift-code-redeem';
import type { BackendRequestContext } from '@src/api/bot/context';
import { BackendAPIError } from '@src/api/bot/client';

import { extractCode } from '@src/response/redeemCode/claim/command';

type ClaimResult =
  | { code: 'NO_CODE' }
  | { code: 'CUSTOM_SUCCESS' | 'COMEBACK_SUCCESS' | 'TEST_SUCCESS'; displayMsg: string; rewardSummary: string[] }
  | { code: 'FAILED'; displayMsg: string };

export async function getClaimData(uid: number, bid: string, messageText: string | undefined, request?: BackendRequestContext): Promise<ClaimResult> {
  const rawCode = extractCode(messageText ?? '');

  if (!rawCode) {
    return { code: 'NO_CODE' };
  }

  try {
    const redeemed = await redeemBackendGiftCode(bid, uid, rawCode, request);

    return { code: 'CUSTOM_SUCCESS', displayMsg: redeemed.message, rewardSummary: redeemed.rewardSummary };
  } catch (error) {
    if (!isBackendNotFound(error)) {
      return { code: 'FAILED', displayMsg: error instanceof BackendAPIError ? error.message : '礼包码兑换失败，请稍后再试' };
    }
  }

  let comebackError: unknown;

  try {
    const redeemed = await redeemBackendExternalGiftCode(bid, uid, rawCode, 'comeback', request);

    return { code: 'COMEBACK_SUCCESS', displayMsg: redeemed.message, rewardSummary: redeemed.rewardSummary };
  } catch (error) {
    comebackError = error;
  }
  try {
    const redeemed = await redeemBackendExternalGiftCode(bid, uid, rawCode, 'test', request);

    return { code: 'TEST_SUCCESS', displayMsg: redeemed.message, rewardSummary: redeemed.rewardSummary };
  } catch (error) {
    const preferred = error instanceof BackendAPIError ? error : comebackError;

    return { code: 'FAILED', displayMsg: preferred instanceof BackendAPIError ? preferred.message : '礼包码无效或已使用' };
  }
}
