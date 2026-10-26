import { confirmBackendPeiyuan, parsePeiyuanConfirm } from '@src/api/bot/peiyuan-confirm';
import type { BackendRequestContext } from '@src/api/bot/context';
export default async function App(params: {
  load?: () => ReturnType<typeof confirmBackendPeiyuan>;
  bid: string;
  uid: number;
  request?: BackendRequestContext;
}) {
  try {
    return {
      code: 'OK' as const,
      data: parsePeiyuanConfirm(params.load ? await params.load() : await confirmBackendPeiyuan(params.bid, params.uid, params.request))
    };
  } catch (error) {
    return { code: 'CONFIRM_FAILED' as const, message: error instanceof Error ? error.message : '确认失败', uid: params.uid };
  }
}
