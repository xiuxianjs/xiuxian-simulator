import { requestBackend } from './client';
import type { BackendRequestContext } from './context';

/** Command hints need a live balance, without loading market listings or purchase quota. */
export async function getBackendMarketGuideBalance(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<number> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const value: unknown = await requestBackend(bid, 'get_players_id_currencies', {
    path: { id: uid },
    ...(request?.requestId ? { requestId: request.requestId } : {})
  });
  const balance = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>).SPIRIT_CRYSTAL : undefined;

  if (typeof balance !== 'number' || !Number.isSafeInteger(balance)) {
    throw new Error('货币余额响应不完整');
  }

  return balance;
}
