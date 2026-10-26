import { teachBackendMaster } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
export { parseTeachMasterCommand } from '@src/utils/masterCommand';
type Result = { code: 'OK'; data: { message: string | string[] } } | { code: 'FAIL'; data: { message: string | string[] } };
export default async function App(params: {
  bid?: string;
  uid: number;
  discipleArg: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const result = await teachBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand);

    return { code: 'OK', data: { message: result.message.includes('\n') ? result.message.split('\n').filter(Boolean) : result.message } };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '传功失败' } };
  }
}
