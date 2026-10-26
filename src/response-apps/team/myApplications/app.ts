import { formatGameTime } from '@src/utils/gameTime';
import { requestTeamWorkflow } from '@src/api/bot/social-workflows';
import { logger } from 'alemonjs';

export type MyApplicationItem = {
  id: number;
  leaderName: string;
  createdAt: string | null;
};

export type LeaderApplicationItem = {
  id: number;
  userId: number;
  userName: string;
};

export type MyApplicationsResult =
  | { code: 'LOCKED'; data: { realmName: string } }
  | { code: 'LEADER'; data: { leaderName: string; applications: LeaderApplicationItem[] } }
  | { code: 'MEMBER'; data: { applications: MyApplicationItem[] } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<MyApplicationsResult> {
  try {
    const data = await requestTeamWorkflow(params.bid, params.uid, { action: 'applications' });

    if (!('records' in data)) {
      throw new Error('队伍申请响应不完整');
    }
    const facts = data.records;

    if (!facts.canUseSecondLayerFeature) {
      return { code: 'LOCKED', data: { realmName: facts.realmName } };
    }
    if (facts.isLeader) {
      if (!data.pending) {
        throw new Error('队伍待处理申请响应不完整');
      }

      return {
        code: 'LEADER',
        data: {
          leaderName: data.pending.leaderName ?? '未知',
          applications: data.pending.applications.map(app => ({ id: app.id, userId: app.userId, userName: app.userName ?? '未知' }))
        }
      };
    }

    return {
      code: 'MEMBER',
      data: {
        applications: facts.applications.map(app => ({
          id: app.id,
          leaderName: app.leaderName ?? '未知',
          createdAt: app.createdAt ? formatGameTime(app.createdAt) : null
        }))
      }
    };
  } catch (error) {
    logger.error('查询我的队伍申请失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
