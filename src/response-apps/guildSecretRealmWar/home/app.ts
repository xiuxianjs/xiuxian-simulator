import { getBackendSecretRealmHome } from '@src/api/bot/guild-secret-realm-war';

type AppResult = { code: 'OK'; data: Awaited<ReturnType<typeof getBackendSecretRealmHome>> } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    return { code: 'OK', data: await getBackendSecretRealmHome(params.bid, params.uid) };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取灵脉攻防战信息失败' } };
  }
}
