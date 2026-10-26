import { postBackendGuildMining } from '@src/api/bot/guild-mining';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'FAIL'; data: { message: string } } | { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext; repeatCommand?: string }): Promise<AppResult> {
  try {
    const result = await postBackendGuildMining(params.bid, params.uid, params.request, params.repeatCommand);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    if (error?.status === 409 || error?.code === 'CONFLICT') {
      return { code: 'FAIL', data: { message: error?.message ?? '采矿失败' } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '挖矿失败' } };
  }
}
