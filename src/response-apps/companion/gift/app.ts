import { BackendAPIError } from '@src/api';
import { giveBackendCompanionGift } from '@src/api/bot/companion-gift';
import type { BackendRequestContext } from '@src/api/bot/context';

type GiftResult = { code: 'GIFT_FAIL'; data: { message: string } } | { code: 'GIFT_OK'; data: { message: string; tongxinGained: number; reply: string } };

/** The robot only forwards parsed command input and renders the server settlement. */
export async function performGift(params: {
  uid: number;
  bid?: string;
  targetUid: number;
  giftName: string;
  request?: BackendRequestContext;
}): Promise<GiftResult> {
  try {
    const result = await giveBackendCompanionGift(params.bid, params.uid, params.targetUid, params.giftName, params.request);

    return {
      code: 'GIFT_OK',
      data: {
        message: result.message,
        tongxinGained: result.tongxinGained,
        reply: result.reply
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      return { code: 'GIFT_FAIL', data: { message: error.message } };
    }

    return { code: 'GIFT_FAIL', data: { message: '赠送失败，请稍后再试' } };
  }
}
