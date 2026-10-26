import { redeemBackendExternalGiftCode } from '@src/api/bot/gift-code-redeem';
import type { BackendRequestContext } from '@src/api/bot/context';

export type ClaimTestGiftAppData = {
  message: string;
  rewardSummary: string[];
};

export type ClaimTestGiftAppResult =
  { code: 'OK'; data: ClaimTestGiftAppData } | { code: 'INVALID_CODE'; data?: undefined } | { code: 'CLAIM_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid: string; code: string; request?: BackendRequestContext }): Promise<ClaimTestGiftAppResult> {
  if (!params.code) {
    return { code: 'INVALID_CODE' };
  }

  try {
    return { code: 'OK', data: await redeemBackendExternalGiftCode(params.bid, params.uid, params.code, 'test', params.request) };
  } catch (error) {
    return {
      code: 'CLAIM_FAILED',
      data: { message: error instanceof Error ? error.message : '领取测试礼包失败' }
    };
  }
}
