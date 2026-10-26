import { requestBackend } from './client';
import { parsePublicTribulationEvent, parsePublicTribulationList, type PublicTribulationQuery } from '../schemas/public-tribulation';

export async function listBackendPublicTribulations(bid: string | undefined, query: PublicTribulationQuery) {
  if (!bid?.trim()) {
    throw new Error('公开渡劫查询缺少平台身份');
  }

  return parsePublicTribulationList(await requestBackend(bid, 'get_tribulation_events', { query }));
}
export async function observeBackendPublicTribulation(bid: string | undefined, eventId: number) {
  if (!bid?.trim() || !Number.isSafeInteger(eventId) || eventId <= 0) {
    throw new Error('公开渡劫查询参数无效');
  }

  return parsePublicTribulationEvent(await requestBackend(bid, 'get_tribulation_events_eventId', { path: { eventId } }));
}
