import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendGuildImpeachResult = {
  outcome: 'counted' | 'counted_no_successor' | 'leader_removed';
  message: string;
};

export async function impeachBackendGuildLeader(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendGuildImpeachResult> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('弹劾参数无效');
  }
  const data = await requestBackend(bid, 'post_players_id_guild_leadership_impeach', {
    path: { id: uid },
    ...writeContext(request),
    headers: repeatPresentationHeaders(repeatCommand)
  });

  return parseGuildImpeach(data);
}

export function parseGuildImpeach(data: unknown): BackendGuildImpeachResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('弹劾响应不完整');
  }
  const result = data as Record<string, unknown>;

  if (
    (result.outcome !== 'counted' && result.outcome !== 'counted_no_successor' && result.outcome !== 'leader_removed') ||
    typeof result.message !== 'string'
  ) {
    throw new Error('弹劾响应不完整');
  }

  return { outcome: result.outcome, message: result.message };
}
