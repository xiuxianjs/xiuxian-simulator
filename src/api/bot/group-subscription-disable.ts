import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
export async function disableBackendGroupSubscription(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<boolean> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_players_id_notification_subscription', { path: { id: uid }, ...context });

  if (!data || typeof data !== 'object' || !('disabled' in data) || typeof data.disabled !== 'boolean') {
    throw new Error('群订阅关闭响应不完整');
  }

  return data.disabled;
}
