import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { TeamMatchCancelResult } from '../schemas/team-match-cancel';

export async function cancelBackendTeamMatch(bid: string | undefined, request?: BackendRequestContext): Promise<TeamMatchCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_teams_match_cancel', { ...writeContext(request) });

  return parseBackendTeamMatchCancel(data);
}

export function parseBackendTeamMatchCancel(value: unknown): TeamMatchCancelResult {
  const data = value as TeamMatchCancelResult;

  if (!data || typeof data.cancelled !== 'boolean' || (data.cancelled ? typeof data.targetLabel !== 'string' : data.targetLabel !== null)) {
    throw new Error('取消匹配响应不完整');
  }

  return data;
}
