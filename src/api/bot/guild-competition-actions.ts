import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type ActionResult = { message: string };
export function parseCompetitionActionResult(value: unknown): ActionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as Record<string, unknown>).message !== 'string') {
    throw new Error('宗门大比服务响应不完整');
  }

  return value as ActionResult;
}
export async function applyBackendGuildCompetition(bid: string | undefined, uid: number, request: BackendRequestContext): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_players_id_guild_competition_apply', {
      headers: repeatPresentationHeaders('宗门大比报名'),
      path: { id: uid },
      ...writeContext(request)
    })
  );
}
export async function addBackendGuildCompetitionMember(
  bid: string | undefined,
  uid: number,
  targetUserId: number,
  position: number,
  request: BackendRequestContext
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_players_id_guild_competition_team_members', {
      path: { id: uid },
      body: { targetUserId, position },
      ...writeContext(request)
    })
  );
}
export async function removeBackendGuildCompetitionMember(
  bid: string | undefined,
  uid: number,
  position: number,
  request: BackendRequestContext
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'delete_players_id_guild_competition_team_members_position', {
      headers: repeatPresentationHeaders('移除宗门大比成员'),
      path: { id: uid, position },
      ...writeContext(request)
    })
  );
}
export async function adjustBackendGuildCompetitionMember(
  bid: string | undefined,
  uid: number,
  fromPosition: number,
  toPosition: number,
  request: BackendRequestContext
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_players_id_guild_competition_team_position', {
      headers: repeatPresentationHeaders('调整宗门大比位置'),
      path: { id: uid },
      body: { fromPosition, toPosition },
      ...writeContext(request)
    })
  );
}
export async function clearBackendGuildCompetitionTeam(bid: string | undefined, uid: number, request: BackendRequestContext): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'delete_players_id_guild_competition_team', {
      headers: repeatPresentationHeaders('宗门大比清队'),
      path: { id: uid },
      ...writeContext(request)
    })
  );
}
export async function betBackendGuildCompetition(
  bid: string | undefined,
  uid: number,
  guildId: number,
  amount: number,
  request: BackendRequestContext
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_players_id_guild_competition_bets', {
      headers: repeatPresentationHeaders('押注宗门大比'),
      path: { id: uid },
      body: { guildId, amount },
      ...writeContext(request)
    })
  );
}
export async function followBetBackendGuildCompetition(
  bid: string | undefined,
  uid: number,
  amount: number,
  request: BackendRequestContext
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_players_id_guild_competition_bets_follow', {
      headers: repeatPresentationHeaders('追投宗门大比'),
      path: { id: uid },
      body: { amount },
      ...writeContext(request)
    })
  );
}

export async function claimBackendGuildCompetitionRewards(bid: string | undefined, request: BackendRequestContext): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseCompetitionActionResult(
    await requestBackend(bid, 'post_guild_competitions_current_rewards_claim', { headers: repeatPresentationHeaders('宗门大比领奖'), ...writeContext(request) })
  );
}

export async function challengeBackendGuildCompetition(
  bid: string | undefined,
  uid: number,
  defenderGuildId: number,
  request: BackendRequestContext
): Promise<unknown> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return await requestBackend(bid, 'post_players_id_guild_competition_knockout_challenges', {
    headers: repeatPresentationHeaders('挑战宗门'),
    path: { id: uid },
    body: { defenderGuildId },
    ...writeContext(request)
  });
}
