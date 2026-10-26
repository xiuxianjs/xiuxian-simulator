import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GuildMilestoneClaim = {
  id: number;
  threshold: number;
  description: string;
};

type SingleClaimResult = {
  message: string;
  milestoneId: number;
  type: 'daily_activity' | 'weekly_activity';
  threshold: number;
  currentPoints: number;
  rewards: { spiritStone: number; contribution: number; prestige: number };
};

type ClaimAllResult = {
  message: string;
  partial: boolean;
  claimed: GuildMilestoneClaim[];
};

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export async function postBackendGuildMilestoneClaim(
  bid: string | undefined,
  uid: number,
  milestoneId: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SingleClaimResult> {
  if (!bid) {
    throw new Error('领取缺少平台身份');
  }

  return parseGuildMilestoneClaim(
    await requestBackend(bid, 'post_players_id_guild_milestones_claims_milestoneId', {
      path: { id: uid, milestoneId },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    }),
    milestoneId
  );
}

export function parseGuildMilestoneClaim(value: unknown, milestoneId: number): SingleClaimResult {
  const data = record(value, '宗门里程碑领取响应不完整');
  const rewards = record(data.rewards, '宗门里程碑奖励响应不完整');

  if (
    typeof data.message !== 'string' ||
    !integer(data.milestoneId) ||
    data.milestoneId !== milestoneId ||
    (data.type !== 'daily_activity' && data.type !== 'weekly_activity') ||
    !integer(data.threshold) ||
    !integer(data.currentPoints) ||
    !integer(rewards.spiritStone) ||
    !integer(rewards.contribution) ||
    !integer(rewards.prestige)
  ) {
    throw new Error('宗门里程碑领取响应不完整');
  }

  return data as unknown as SingleClaimResult;
}

export async function postBackendGuildMilestonesClaimAll(
  bid: string | undefined,
  uid: number,
  type: 'daily_activity' | 'weekly_activity',
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ClaimAllResult> {
  if (!bid) {
    throw new Error('领取缺少平台身份');
  }

  return parseGuildMilestonesClaimAll(
    await requestBackend(bid, 'post_players_id_guild_milestones_types_type_claim_all', {
      path: { id: uid, type },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand)
    })
  );
}

export function parseGuildMilestonesClaimAll(value: unknown): ClaimAllResult {
  const data = record(value, '宗门里程碑一键领取响应不完整');

  if (typeof data.message !== 'string' || typeof data.partial !== 'boolean' || !Array.isArray(data.claimed)) {
    throw new Error('宗门里程碑一键领取响应不完整');
  }
  const claimed = data.claimed.map(item => record(item, '宗门里程碑一键领取响应不完整'));

  if (!claimed.every(item => integer(item.id) && integer(item.threshold) && typeof item.description === 'string')) {
    throw new Error('宗门里程碑一键领取响应不完整');
  }

  return data as unknown as ClaimAllResult;
}
