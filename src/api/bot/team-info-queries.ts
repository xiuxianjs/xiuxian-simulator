import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('队伍接口格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('队伍接口缺少数值字段');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('队伍接口缺少状态字段');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('队伍接口缺少文本字段');
  }

  return value;
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}
function actions(value: unknown) {
  const row = record(value);

  return {
    canApply: boolean(row.canApply),
    canInvite: boolean(row.canInvite),
    canManageMembers: boolean(row.canManageMembers),
    canReviewApplications: boolean(row.canReviewApplications),
    canUseTeamMail: boolean(row.canUseTeamMail),
    canViewDungeon: boolean(row.canViewDungeon),
    canLeave: boolean(row.canLeave),
    canDisband: boolean(row.canDisband),
    canViewInvitations: boolean(row.canViewInvitations)
  };
}
function targetInfo(value: unknown): { mode: 'mainline' | 'dungeon'; targetId: number; teamType: 'matching_team' | 'free_team'; targetName: string } | null {
  if (value === null) {
    return null;
  }
  const row = record(value);

  if ((row.mode !== 'mainline' && row.mode !== 'dungeon') || (row.teamType !== 'matching_team' && row.teamType !== 'free_team')) {
    throw new Error('队伍接口目标类型无效');
  }
  const targetId = number(row.targetId);
  const name = nullableText(row.name);

  return {
    mode: row.mode,
    targetId,
    teamType: row.teamType,
    targetName: row.mode === 'mainline' ? `主线 ${name ?? targetId}` : `秘境 ${name === '' ? targetId : (name ?? targetId)}`
  };
}
export function parseBackendTeamInfo(value: unknown) {
  const data = record(value);
  const access = record(data.access);
  const eligibility = { ok: boolean(access.ok), realmName: nullableText(access.realmName) ?? '未知' };

  if (data.team === null) {
    return { access: eligibility, team: null };
  }
  const team = record(data.team);

  if (!Array.isArray(team.members)) {
    throw new Error('队伍接口缺少成员列表');
  }

  return {
    access: eligibility,
    team: {
      teamId: number(team.teamId),
      exists: boolean(team.exists),
      leaderName: nullableText(team.leaderName) ?? '未知',
      memberCount: number(team.memberCount),
      maxMembers: number(team.maxMembers),
      minRealmName: nullableText(team.minRealmName),
      targetInfo: targetInfo(team.target),
      isMember: boolean(team.isMember),
      isLeader: boolean(team.isLeader),
      ownMembershipLeader: boolean(team.ownMembershipLeader),
      actions: actions(team.actions),
      members: team.members.map((value: unknown) => {
        const member = record(value);
        const userId = number(member.userId);

        return { uid: userId, userId, userName: nullableText(member.name) ?? '未知', isLeader: boolean(member.isLeader), position: number(member.position) };
      })
    }
  };
}

export async function getBackendTeamInfo(bid: string | undefined, teamId?: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendTeamInfo(teamId ? await requestBackend(bid, 'get_teams_teamId', { path: { teamId } }) : await requestBackend(bid, 'get_teams_mine'));
}

export async function getBackendTeamOverview(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendTeamInfo(await requestBackend(bid, 'get_players_id_team_overview', { path: { id: uid } }));
}
