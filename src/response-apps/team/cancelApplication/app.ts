import { formatGameTime } from '@src/utils/gameTime';
import { cancelBackendTeamApplication } from '@src/api/bot/team-application-cancel';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendTeamApplicationRecords } from '@src/api/bot';
import { logger } from 'alemonjs';

export type CancelApplicationItem = {
  id: number;
  leaderName: string;
  createdAt: string | null;
};

export type CancelApplicationResult =
  | { code: 'LIST'; data: { applications: CancelApplicationItem[] } }
  | { code: 'NO_PENDING' }
  | { code: 'CANCEL_OK'; data: { message: string } }
  | { code: 'CANCEL_FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  applicationId?: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<CancelApplicationResult> {
  try {
    if (!params.applicationId) {
      const { applications } = await getBackendTeamApplicationRecords(params.bid, params.uid);

      if (applications.length === 0) {
        return { code: 'NO_PENDING' };
      }

      return {
        code: 'LIST',
        data: {
          applications: applications.map(app => ({
            id: app.id,
            leaderName: app.leaderName,
            createdAt: app.createdAt ? formatGameTime(app.createdAt) : null
          }))
        }
      };
    }

    const result = await cancelBackendTeamApplication(params.bid, params.applicationId, params.request, params.repeatCommand);

    if (result.outcome === 'cancelled') {
      const leaderName = result.leaderName === null || result.leaderName === '' ? '未知' : result.leaderName;

      return { code: 'CANCEL_OK', data: { message: `已取消向【${leaderName}】队伍的申请` } };
    }

    return { code: 'CANCEL_FAILED', data: { message: '申请记录不存在或已处理' } };
  } catch (error) {
    logger.error('取消队伍申请失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '取消申请失败，请稍后再试' }
    };
  }
}
