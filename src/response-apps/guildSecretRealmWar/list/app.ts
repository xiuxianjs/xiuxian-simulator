import { getBackendSecretRealms } from '@src/api/bot/guild-secret-realm-war';
type AppResult = { code: 'OK'; data: Awaited<ReturnType<typeof getBackendSecretRealms>> } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { page: number; bid?: string }): Promise<AppResult> {
  try {
    return { code: 'OK', data: await getBackendSecretRealms(params.bid, params.page) };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取秘境列表失败' } };
  }
}
