import { giftBackendMaster } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { GiftPillType } from '@src/utils/masterCommand';
export { parseMasterGiftCommand } from '@src/utils/masterCommand';
type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  discipleArg: string;
  pillType?: GiftPillType;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    return { code: 'OK', data: await giftBackendMaster(params.bid, params.uid, params.discipleArg, params.pillType, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '赐丹失败' } };
  }
}
