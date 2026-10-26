import { expelBackendMaster } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
export { parseExpelMasterCommand } from '@src/utils/masterCommand';
type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  discipleArg: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    return { code: 'OK', data: await expelBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '逐出师门失败' } };
  }
}
