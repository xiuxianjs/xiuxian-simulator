import { recycleBackendGuildRedPacket } from '@src/api/bot/guild-red-packet-mutations';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { bid?: string; uid: number; packetId: number; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await recycleBackendGuildRedPacket(params.bid, params.uid, params.packetId, params.request);

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '回收红包失败，请稍后再试。' } };
  }
}
