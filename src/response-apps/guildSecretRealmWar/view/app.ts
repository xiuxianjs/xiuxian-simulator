import { getBackendSecretRealm } from '@src/api/bot/guild-secret-realm-war';
type AppResult =
  { code: 'OK'; data: Awaited<ReturnType<typeof getBackendSecretRealm>> } | { code: 'NEED_REALM_NO' } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { realmNo: number | null; page: number; bid?: string }): Promise<AppResult> {
  if (!params.realmNo) {
    return { code: 'NEED_REALM_NO' };
  }
  try {
    return { code: 'OK', data: await getBackendSecretRealm(params.bid, params.realmNo, params.page) };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查看秘境失败' } };
  }
}
