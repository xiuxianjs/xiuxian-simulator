import { challengeBackendSecretRealm } from '@src/api/bot/guild-secret-realm-war';
import type { BackendRequestContext } from '@src/api/bot/context';
type AppResult = { code: 'OK'; data: Awaited<ReturnType<typeof challengeBackendSecretRealm>> } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  uid: number;
  realmNo: number;
  positionNo: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    return { code: 'OK', data: await challengeBackendSecretRealm(params.bid, params.uid, params.realmNo, params.positionNo, params.request) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '挑战失败' } };
  }
}
