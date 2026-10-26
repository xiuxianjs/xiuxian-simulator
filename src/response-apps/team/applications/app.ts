import { BackendAPIError, getBackendTeamPendingApplications } from '@src/api/bot';
import { logger } from 'alemonjs';

export type TeamApplicationItem = {
  id: number;
  userId: number;
  userName: string;
  teamId: number;
};

export type TeamApplicationsData = {
  leaderName: string;
  applications: TeamApplicationItem[];
};

export type TeamApplicationsResult = { code: 'OK'; data: TeamApplicationsData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<TeamApplicationsResult> {
  try {
    return { code: 'OK', data: await getBackendTeamPendingApplications(params.bid, params.uid) };
  } catch (error) {
    if (error instanceof BackendAPIError && (error.status === 404 || error.status === 403)) {
      return { code: 'LOAD_FAILED', data: { message: error.status === 404 ? '你还未加入队伍' : '你不是队长' } };
    }
    logger.error('查询队伍申请失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
