import { redeemBackendExternalGiftCode } from '@src/api/bot/gift-code-redeem';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'NO_CODE';
      data: { message: string };
    }
  | {
      code: 'FAIL';
      data: { message: string };
    }
  | {
      code: 'OK';
      data: { message: string; rewardSummary: string[] };
    };

function extractComebackCode(messageText: string) {
  return messageText.replace(/^(!|！|\/|#|＃)?领取回归礼包/, '').trim();
}

export default async function App(params: { uid: number; bid: string; messageText: string; request?: BackendRequestContext }): Promise<Result> {
  const { uid, bid, messageText } = params;
  const code = extractComebackCode(messageText);

  if (!code) {
    return {
      code: 'NO_CODE',
      data: { message: '请输入礼包码，例如：/领取回归礼包 ABCD1234' }
    };
  }

  try {
    return { code: 'OK', data: await redeemBackendExternalGiftCode(bid, uid, code, 'comeback', params.request) };
  } catch (error) {
    return {
      code: 'FAIL',
      data: { message: error instanceof Error ? error.message : '领取回归礼包失败' }
    };
  }
}
