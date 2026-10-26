import { cancelBackendPeiyuan } from '@src/api/bot/peiyuan-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';

export type PeiyuanDanCancelResult =
  | {
      code: 'OK';
      data: {
        message: string;
      };
    }
  | {
      code: 'INVALID_USER';
    }
  | {
      code: 'CANCEL_FAILED';
      message: string;
      uid: number;
    };

export default async function App(params: { bid: string; uid: number; request?: BackendRequestContext }): Promise<PeiyuanDanCancelResult> {
  const uid = params.uid;

  if (!uid) {
    return { code: 'INVALID_USER' };
  }

  const result = await cancelBackendPeiyuan(params.bid, uid, params.request);

  if (result.outcome === 'not_pending') {
    return {
      code: 'CANCEL_FAILED',
      message: result.message,
      uid
    };
  }

  return {
    code: 'OK',
    data: {
      message: result.message
    }
  };
}
