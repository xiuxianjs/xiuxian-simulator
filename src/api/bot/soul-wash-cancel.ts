import type { SoulWashCancelData } from '../schemas/soul-wash-cancel';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
export async function cancelBackendSoulWash(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<SoulWashCancelData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_soul_artifacts_wash_cancel', { path: { id: uid }, ...context });

  return parseSoulWashCancel(data);
}

export function parseSoulWashCancel(value: unknown): SoulWashCancelData {
  const data = value as SoulWashCancelData;

  if (!data || !['cancelled', 'no_pending', 'busy', 'conflict'].includes(data.status) || !Number.isSafeInteger(data.totalSuccess) || data.totalSuccess < 0) {
    throw new Error('本命物洗涤取消接口数据不完整');
  }

  return data;
}
