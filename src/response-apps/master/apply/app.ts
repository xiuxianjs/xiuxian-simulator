import { applyBackendMaster } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

export { parseApplyMasterCommand } from '@src/utils/masterCommand';
type Result = { code: 'OK'; data: { message: string; targetName?: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  targetArg: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    return { code: 'OK', data: await applyBackendMaster(params.bid, params.uid, params.targetArg, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '拜师申请失败' } };
  }
}
