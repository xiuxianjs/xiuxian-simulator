import { getBackendTeams } from '@src/api';
import { logger } from 'alemonjs';

export type TeamListItem = {
  teamId: number;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  minRealmName: string | null;
};

export type TeamListData = {
  teams: TeamListItem[];
  currentPage: number;
  totalPages: number;
  total: number;
};

export type TeamListResult = { code: 'OK'; data: TeamListData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; page: number; pageSize: number }): Promise<TeamListResult> {
  try {
    const result = await getBackendTeams(params.bid, params.page, params.pageSize);

    return {
      code: 'OK',
      data: {
        teams: result.teams.map(team => ({
          teamId: team.teamId,
          leaderName: team.leaderName,
          memberCount: team.memberCount,
          maxMembers: team.maxMembers,
          minRealmName: team.minRealmName
        })),
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        total: result.total
      }
    };
  } catch (error) {
    logger.error('查询队伍列表失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
