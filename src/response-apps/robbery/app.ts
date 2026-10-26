import { robBackend } from '@src/api/bot/robbery';
import type { BackendRequestContext } from '@src/api/bot/context';

export default async function App(params: { bid?: string; uid: number; targetUid: number; request?: BackendRequestContext }) {
  try {
    return { code: 'OK' as const, data: await robBackend(params.bid, params.uid, params.targetUid, params.request) };
  } catch (error) {
    return { code: 'LOAD_FAILED' as const, data: { message: error instanceof Error ? error.message : '打劫失败，请稍后再试' } };
  }
}
