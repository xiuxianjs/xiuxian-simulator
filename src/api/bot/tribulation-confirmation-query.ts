import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseTribulationConfirmation, type TribulationGrade } from '../schemas/tribulation';
export async function confirmBackendTribulationQuery(
  bid: string | undefined,
  uid: number,
  eventId: number,
  grade: TribulationGrade,
  request?: BackendRequestContext
) {
  if (!bid) {
    throw new Error('渡劫操作参数无效');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_tribulation_events_eventId_confirmation_query', {
    path: { id: uid, eventId },
    body: { grade },
    ...writeContext(request)
  });

  return parseTribulationConfirmationQuery(data);
}

export function parseTribulationConfirmationQuery(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('渡劫确认聚合响应不完整');
  }
  const value = data as Record<string, unknown>;

  if (!value.materialNames || typeof value.materialNames !== 'object' || Array.isArray(value.materialNames)) {
    throw new Error('渡劫材料名称响应不完整');
  }
  const materialNames: Record<number, string> = {};

  for (const [key, name] of Object.entries(value.materialNames)) {
    if (!/^\d+$/.test(key) || !Number.isSafeInteger(Number(key)) || typeof name !== 'string') {
      throw new Error('渡劫材料名称无效');
    }
    materialNames[Number(key)] = name;
  }

  return { confirmation: parseTribulationConfirmation(value.confirmation), materialNames };
}
