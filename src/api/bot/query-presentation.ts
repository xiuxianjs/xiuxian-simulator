import type { BackendRequestContext } from './context';
import { requestBackend } from './client';
import { repeatPresentationHeaders } from './repeat-presentation';
import { parseBackendDungeonDetail } from './queries';

export function requestBackendQueryPresentation(
  bid: string,
  uid: number,
  query: 'dungeon_detail' | 'newcomer_login' | 'world_milestones',
  command: string | undefined,
  request?: BackendRequestContext,
  name?: string
) {
  return requestBackend(bid, 'post_players_id_query_presentations', {
    path: { id: uid },
    body: { query, name },
    requestId: request?.requestId,
    idempotencyKey: request?.idempotencyKey,
    headers: repeatPresentationHeaders(request?.idempotencyKey ? command : undefined)
  });
}
export async function getBackendDungeonDetailCommand(
  bid: string | undefined,
  uid: number,
  name: string,
  command: string | undefined,
  request?: BackendRequestContext
) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendDungeonDetail(await requestBackendQueryPresentation(bid, uid, 'dungeon_detail', command, request, name));
}
