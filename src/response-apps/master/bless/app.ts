import { blessBackendMaster } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
export { parseBlessMasterCommand } from '@src/utils/masterCommand';
type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  discipleArg: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    return { code: 'OK', data: await blessBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '赐福失败' } };
  }
}
