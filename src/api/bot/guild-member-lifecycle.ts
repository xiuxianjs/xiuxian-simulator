import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GuildMemberMutation = {
  outcome: string;
  message: string;
  guildId: number;
  guildName: string;
  confirmationRequired: boolean;
  targetUserId?: number;
  targetName?: string;
  roleName?: string;
};
export type GuildLeadershipCandidate = {
  index: number;
  name: string;
  roleName: string;
  weeklyActivity: number;
  contributionTotal: number;
};
export type GuildLeadershipTransfer = GuildMemberMutation & {
  candidates: GuildLeadershipCandidate[];
  confirmationExpiresInSeconds?: number;
};
export function parseGuildMemberMutation(data: unknown): GuildMemberMutation {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('宗门操作响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    typeof row.outcome !== 'string' ||
    typeof row.message !== 'string' ||
    !Number.isInteger(row.guildId) ||
    typeof row.guildName !== 'string' ||
    typeof row.confirmationRequired !== 'boolean'
  ) {
    throw new Error('宗门操作响应不完整');
  }

  return row as GuildMemberMutation;
}
function options(id: number, request?: BackendRequestContext) {
  return { path: { id }, ...writeContext(request) };
}
export async function leaveBackendGuild(bid: string | undefined, id: number, request?: BackendRequestContext, repeatCommand?: string) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildMemberMutation(
    await requestBackend(bid, 'post_players_id_guild_leave', { ...options(id, request), headers: repeatPresentationHeaders(repeatCommand) })
  );
}
export async function leaderLeaveBackendGuild(bid: string | undefined, id: number, request?: BackendRequestContext, repeatCommand?: string) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildMemberMutation(
    await requestBackend(bid, 'post_players_id_guild_leader_leave', { ...options(id, request), headers: repeatPresentationHeaders(repeatCommand) })
  );
}
export async function kickBackendGuildMember(bid: string | undefined, id: number, targetId: number, request?: BackendRequestContext, repeatCommand?: string) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildMemberMutation(
    await requestBackend(bid, 'post_players_id_guild_kick_targetId', {
      path: { id, targetId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}
export async function transferBackendGuildLeadership(bid: string | undefined, id: number, index: number, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildLeadershipTransfer(await requestBackend(bid, 'post_players_id_guild_leadership_transfer', { ...options(id, request), body: { index } }));
}

export function parseGuildLeadershipTransfer(value: unknown) {
  const data = parseGuildMemberMutation(value);
  const row = data as GuildLeadershipTransfer;

  if (!['candidates', 'confirmation_required', 'transferred'].includes(row.outcome)) {
    throw new Error('宗主转让响应不完整');
  }

  if (!Array.isArray((data as Record<string, unknown>).candidates)) {
    throw new Error('宗主转让候选响应不完整');
  }
  row.candidates = (data as Record<string, unknown>).candidates as GuildLeadershipCandidate[];
  for (const candidate of row.candidates) {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate) ||
      !Number.isInteger(candidate.index) ||
      typeof candidate.name !== 'string' ||
      typeof candidate.roleName !== 'string' ||
      !Number.isInteger(candidate.weeklyActivity) ||
      !Number.isInteger(candidate.contributionTotal)
    ) {
      throw new Error('宗主转让候选响应不完整');
    }
  }
  if (row.confirmationExpiresInSeconds !== undefined && !Number.isInteger(row.confirmationExpiresInSeconds)) {
    throw new Error('宗主转让确认响应不完整');
  }

  return row;
}
