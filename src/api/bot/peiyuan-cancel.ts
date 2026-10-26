import { repeatPresentationHeaders } from './repeat-presentation';
import type { PeiyuanCancelResult } from '../schemas/peiyuan-cancel';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export async function cancelBackendPeiyuan(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<PeiyuanCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);

  return parseBackendPeiyuanCancel(
    await requestBackend(bid, 'post_players_id_peiyuan_dan_cancel', {
      path: { id: uid },
      headers: repeatPresentationHeaders('取消培元丹'),
      ...context
    })
  );
}

export function parseBackendPeiyuanCancel(value: unknown): PeiyuanCancelResult {
  const data = value as PeiyuanCancelResult;

  if (data?.outcome === 'cancelled' && typeof data.pendingJson === 'string' && typeof data.message === 'string' && data.message.trim()) {
    return data;
  }
  if (data?.outcome === 'not_pending' && data.pendingJson === null && typeof data.message === 'string' && data.message.trim()) {
    return data;
  }
  throw new Error('培元丹取消响应不完整');
}
