import { rejectBackendTeamApplication } from '@src/api/bot/team-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type RejectResult = { code: 'OK' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  uid: number;
  applicationId: number;
  bid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<RejectResult> {
  try {
    await rejectBackendTeamApplication(params.bid, params.applicationId, params.request, params.repeatCommand);

    return { code: 'OK' };
  } catch (error) {
    logger.error('拒绝队伍申请失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '操作失败' }
    };
  }
}
