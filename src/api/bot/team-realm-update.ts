import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TeamRealmUpdateResult } from '../schemas/team-realm-update';

export async function updateBackendTeamRealm(
  bid: string | undefined,
  uid: number,
  realmName: string | null,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<TeamRealmUpdateResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'patch_players_id_team_min_realm', {
    path: { id: uid },
    body: { realmName },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseTeamRealmUpdate(data);
}

export function parseTeamRealmUpdate(data: unknown): TeamRealmUpdateResult {
  const result = data as TeamRealmUpdateResult;

  if (
    !result ||
    !['updated', 'cancel_noop', 'realm_not_found', 'not_in_team', 'not_leader'].includes(result.outcome) ||
    (result.outcome === 'updated' && result.realmId === null) ||
    (result.outcome === 'cancel_noop' && result.realmId !== null) ||
    (result.realmId !== null && (!Number.isFinite(result.realmId) || !Number.isInteger(result.realmId) || result.realmId < 0))
  ) {
    throw new Error('队伍境界设置响应不完整');
  }

  return result;
}
