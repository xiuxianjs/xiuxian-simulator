import { resetBackendDemonTower } from '@src/api/bot/demon-tower-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type ResetResult = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; messageText?: string; request?: BackendRequestContext }): Promise<ResetResult> {
  try {
    const result = await resetBackendDemonTower(params.bid, params.uid, params.request, params.messageText);

    return { code: 'OK', data: { message: result.message } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '妖塔重置失败，请稍后再试' } };
  }
}
