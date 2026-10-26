import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseBackendRealmPromotion } from './realm-promotion';
export async function executeBackendPromotionCommand(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('晋级操作参数无效');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_realm_promotion_command', { path: { id: uid }, body: {}, ...writeContext(request) });

  return parsePromotionCommand(data);
}

export function parsePromotionCommand(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('晋级聚合响应不完整');
  }
  const value = data as Record<string, unknown>;

  if (value.mode === 'preparation') {
    if (!value.overview || typeof value.overview !== 'object' || !(value.overview as Record<string, unknown>).tribulationPreparation) {
      throw new Error('晋级渡劫准备响应不完整');
    }

    return { mode: 'preparation' as const, overview: value.overview as { tribulationPreparation: unknown } };
  }
  if (value.mode !== 'promotion') {
    throw new Error('晋级聚合响应状态无效');
  }
  const overview = value.overview && typeof value.overview === 'object' ? (value.overview as Record<string, unknown>) : null;

  return { mode: 'promotion' as const, result: parseBackendRealmPromotion(value.result), overview };
}
