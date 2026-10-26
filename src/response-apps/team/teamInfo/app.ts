import { getBackendTeamInfo } from '@src/api/bot/team-info-queries';
import { logger } from 'alemonjs';

export type TeamInfoMember = {
  userId: number;
  userName: string;
  isLeader: boolean;
  position: number;
};

export type TeamInfoData = {
  teamId: number;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  minRealmName: string | null;
  targetInfo: {
    mode: 'mainline' | 'dungeon';
    targetId: number;
    targetName: string;
    teamType: 'matching_team' | 'free_team';
  } | null;
  members: TeamInfoMember[];
  isMember: boolean;
  isLeader: boolean;
  actions: {
    canApply: boolean;
    canInvite: boolean;
    canManageMembers: boolean;
    canReviewApplications: boolean;
    canUseTeamMail: boolean;
    canViewDungeon: boolean;
    canLeave: boolean;
    canDisband: boolean;
    canViewInvitations: boolean;
  };
};

export type TeamInfoResult = { code: 'OK'; data: TeamInfoData } | { code: 'NO_TEAM' | 'TEAM_NOT_FOUND' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; teamId?: number }): Promise<TeamInfoResult> {
  try {
    const result = await getBackendTeamInfo(params.bid, params.teamId);

    if (!result.team) {
      return { code: params.teamId ? 'TEAM_NOT_FOUND' : 'NO_TEAM' };
    }
    if (!result.team.exists) {
      return { code: 'TEAM_NOT_FOUND' };
    }

    return { code: 'OK', data: result.team };
  } catch (error) {
    logger.error('查询队伍信息失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
