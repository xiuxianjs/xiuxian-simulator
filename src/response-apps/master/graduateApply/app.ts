import { applyBackendGraduation } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: { bid?: string; uid: number; repeatCommand?: string; request?: BackendRequestContext }): Promise<Result> {
  try {
    return { code: 'OK', data: await applyBackendGraduation(params.bid, params.uid, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '申请出师失败' } };
  }
}
