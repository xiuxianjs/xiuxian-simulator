import { challengeBackendScarecrow } from '@src/api/bot/scarecrow';
import type { BackendRequestContext } from '@src/api/bot/context';

export default async function App(params: { bid: string; uid: number; roundsText?: string; request?: BackendRequestContext }) {
  try {
    return { code: 'OK' as const, data: await challengeBackendScarecrow(params.bid, params.uid, params.roundsText, params.request) };
  } catch (error) {
    return { code: 'FAIL' as const, data: { message: error instanceof Error ? error.message : '稻草人测试失败' } };
  }
}
