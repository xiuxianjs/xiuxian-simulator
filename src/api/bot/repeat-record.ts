import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { RepeatRecordData } from '../schemas/repeat-record';
export async function updateBackendRepeatRecord(
  bid: string | undefined,
  uid: number,
  command: string,
  message: string,
  request?: BackendRequestContext
): Promise<RepeatRecordData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_client_state_repeat_record', { path: { id: uid }, body: { command, message }, ...context });

  if (!data || !Number.isFinite(data.count) || typeof data.suffix !== 'string') {
    throw new Error('重复记录响应不完整');
  }

  return data;
}
