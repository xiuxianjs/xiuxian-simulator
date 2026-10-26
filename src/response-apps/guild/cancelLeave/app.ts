import { cancelBackendGuildLeaveConfirmation } from '@src/api/bot/guild-leave-confirmation-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    await cancelBackendGuildLeaveConfirmation(params.bid, params.uid, params.request);

    return { code: 'OK', data: { message: '✅ 已取消退出宗门操作' } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '取消操作失败' } };
  }
}
