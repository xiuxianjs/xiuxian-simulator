import { claimBackendSecretRealm } from '@src/api/bot/guild-secret-realm-war';
import type { BackendRequestContext } from '@src/api/bot/context';
type AppResult = { code: 'OK'; data: Awaited<ReturnType<typeof claimBackendSecretRealm>> } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    return { code: 'OK', data: await claimBackendSecretRealm(params.bid, params.uid, params.request) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '领取奖励失败' } };
  }
}
