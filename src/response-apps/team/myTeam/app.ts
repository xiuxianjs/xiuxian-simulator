import { getBackendTeamOverview } from '@src/api/bot/team-info-queries';
import { logger } from 'alemonjs';

export type MyTeamMember = {
  uid: number;
  userId: number;
  userName: string;
  isLeader: boolean;
  position: number;
};

export type MyTeamData = {
  teamId: number;
  isLeader: boolean;
  leaderName: string;
  targetInfo: {
    mode: 'mainline' | 'dungeon';
    targetId: number;
    targetName: string;
    teamType: 'matching_team' | 'free_team';
  } | null;
  members: MyTeamMember[];
  actions: {
    canInvite: boolean;
    canManageMembers: boolean;
    canReviewApplications: boolean;
    canUseTeamMail: boolean;
    canViewDungeon: boolean;
    canLeave: boolean;
    canDisband: boolean;
  };
};

export type MyTeamResult =
  { code: 'OK'; data: MyTeamData } | { code: 'NO_TEAM' } | { code: 'LOCKED'; data: { realmName: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<MyTeamResult> {
  try {
    const result = await getBackendTeamOverview(params.bid, params.uid);

    if (!result.access.ok) {
      return { code: 'LOCKED', data: { realmName: result.access.realmName } };
    }
    if (!result.team) {
      return { code: 'NO_TEAM' };
    }

    return { code: 'OK', data: { ...result.team, isLeader: result.team.ownMembershipLeader } };
  } catch (error) {
    logger.error('查询我的队伍失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
