import { repeatPresentationHeaders } from './repeat-presentation';
import type { TeamCancelApplicationResult } from '../schemas/team-application-cancel';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export async function cancelBackendTeamApplication(
  bid: string | undefined,
  applicationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<TeamCancelApplicationResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data: unknown = await requestBackend(bid, 'delete_teams_applications_applicationId', {
    path: { applicationId },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('取消申请接口响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    (row.outcome !== 'cancelled' && row.outcome !== 'not_pending') ||
    (row.leaderName !== null && typeof row.leaderName !== 'string') ||
    (row.outcome === 'not_pending' && row.leaderName !== null)
  ) {
    throw new Error('取消申请接口响应不完整');
  }

  return data as TeamCancelApplicationResult;
}
