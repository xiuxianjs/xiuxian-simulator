import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GuildCreateMutation = { guildId: number; name: string };
export type GuildApplyMutation = { applicationId: number; guildId: number; guildName: string; levelName: string; memberCount: number };
export type GuildApplicationDecisionMutation = {
  outcome: string;
  applicationId: number;
  guildId: number;
  applicantId: number;
  applicantName: string;
  message: string;
};

function record(data: unknown, message: string): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(message);
  }

  return data as Record<string, unknown>;
}

function integer(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

export async function createBackendGuild(
  bid: string | undefined,
  uid: number,
  name: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildCreateMutation> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildCreate(
    await requestBackend(bid, 'post_players_id_guilds', {
      path: { id: uid },
      body: { name },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildCreate(value: unknown): GuildCreateMutation {
  const data = record(value, '创建宗门响应不完整');

  if (!integer(data.guildId, 1) || typeof data.name !== 'string') {
    throw new Error('创建宗门响应不完整');
  }

  return { guildId: data.guildId, name: data.name };
}

export async function applyBackendGuild(
  bid: string | undefined,
  uid: number,
  guildId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildApplyMutation> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildApply(
    await requestBackend(bid, 'post_players_id_guild_applications', {
      path: { id: uid },
      body: { guildId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildApply(value: unknown): GuildApplyMutation {
  const data = record(value, '入宗申请响应不完整');

  if (
    !integer(data.applicationId, 1) ||
    !integer(data.guildId, 1) ||
    typeof data.guildName !== 'string' ||
    typeof data.levelName !== 'string' ||
    !integer(data.memberCount)
  ) {
    throw new Error('入宗申请响应不完整');
  }

  return {
    applicationId: data.applicationId,
    guildId: data.guildId,
    guildName: data.guildName,
    levelName: data.levelName,
    memberCount: data.memberCount
  };
}

export async function decideBackendGuildApplication(
  bid: string | undefined,
  uid: number,
  targetUid: number,
  approve: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildApplicationDecisionMutation> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const requestOptions = {
    path: { id: uid, targetId: targetUid },
    ...writeContext(request),
    headers: approve ? repeatPresentationHeaders(repeatCommand) : undefined
  };
  const response = approve
    ? await requestBackend(bid, 'post_players_id_guild_applications_users_targetId_approve', requestOptions)
    : await requestBackend(bid, 'post_players_id_guild_applications_users_targetId_reject', requestOptions);

  return parseGuildApplicationDecision(response);
}

export function parseGuildApplicationDecision(response: unknown): GuildApplicationDecisionMutation {
  const data = record(response, '宗门审核响应不完整');

  if (
    typeof data.outcome !== 'string' ||
    !['approved', 'rejected', 'auto_rejected'].includes(data.outcome) ||
    !integer(data.applicationId, 1) ||
    !integer(data.guildId, 1) ||
    !integer(data.applicantId, 1) ||
    typeof data.applicantName !== 'string' ||
    typeof data.message !== 'string'
  ) {
    throw new Error('宗门审核响应不完整');
  }

  return {
    outcome: data.outcome,
    applicationId: data.applicationId,
    guildId: data.guildId,
    applicantId: data.applicantId,
    applicantName: data.applicantName,
    message: data.message
  };
}
