import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { GuildCancelApplicationResult } from '../schemas/guild-application-cancel';
export async function cancelBackendGuildApplication(
  bid: string | undefined,
  uid: number,
  applicationId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildCancelApplicationResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_players_id_guild_applications_applicationId', {
    path: { id: uid, applicationId },
    ...context,
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseGuildApplicationCancel(data);
}

export function parseGuildApplicationCancel(data: unknown): GuildCancelApplicationResult {
  if (
    !data ||
    typeof data !== 'object' ||
    !('outcome' in data) ||
    typeof data.outcome !== 'string' ||
    !['cancelled', 'not_pending'].includes(data.outcome) ||
    !('guildExists' in data) ||
    typeof data.guildExists !== 'boolean' ||
    !('guildName' in data) ||
    (data.guildName !== null && typeof data.guildName !== 'string')
  ) {
    throw new Error('取消宗门申请响应不完整');
  }

  return data as GuildCancelApplicationResult;
}
