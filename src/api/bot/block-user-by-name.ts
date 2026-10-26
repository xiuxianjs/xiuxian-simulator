import { repeatPresentationHeaders } from './repeat-presentation';
import type { BlockUserByNameResult } from '../schemas/block-user-by-name';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export async function blockBackendUserByName(
  bid: string | undefined,
  uid: number,
  targetName: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BlockUserByNameResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const result: unknown = await requestBackend(bid, 'post_players_id_blocklist_by_name', {
    path: { id: uid },
    body: { targetName },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseBackendBlockUser(result);
}

export function parseBackendBlockUser(result: unknown): BlockUserByNameResult {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('拉黑响应不完整');
  }
  const row = result as Record<string, unknown>;

  if (
    typeof row.outcome !== 'string' ||
    !['blocked', 'locked', 'target_not_found', 'self', 'target_missing', 'full', 'already_blocked', 'failed'].includes(row.outcome) ||
    (row.name !== null && typeof row.name !== 'string') ||
    (row.realmName !== null && typeof row.realmName !== 'string')
  ) {
    throw new Error('拉黑响应不完整');
  }

  return row as unknown as BlockUserByNameResult;
}
