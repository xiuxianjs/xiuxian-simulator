import { requestTeamWorkflow } from '@src/api/bot/social-workflows';
import type { TargetSelector } from '@src/api/schemas/social-workflows';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_TEAM } from '@src/constants/messages';
import { logger } from 'alemonjs';

export type TransferLeaderResult = { code: 'OK' } | { code: 'TARGET_MISSING' } | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 转让队长
 * @param params.uid 队长uid
 * @param params.targetUid 目标成员uid
 */
export default async function App(params: {
  bid?: string;
  uid: number;
  selector: TargetSelector;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<TransferLeaderResult> {
  try {
    const result = await requestTeamWorkflow(params.bid, params.uid, { action: 'leadership', ...params.selector }, params.request, params.repeatCommand);

    if (!('outcome' in result)) {
      throw new Error('队伍操作响应不完整');
    }
    if (result.outcome === 'target_missing') {
      return { code: 'TARGET_MISSING' };
    }
    if (result.outcome !== 'transferred') {
      const messages = {
        self: MSG_TEAM.CANNOT_TRANSFER_SELF,
        not_in_team: MSG_TEAM.NOT_IN_TEAM,
        not_leader: MSG_TEAM.NOT_LEADER,
        target_not_in_team: MSG_TEAM.TARGET_NOT_IN_TEAM
      };

      return { code: 'LOAD_FAILED', data: { message: messages[result.outcome as keyof typeof messages] } };
    }

    return { code: 'OK' };
  } catch (error) {
    if (!(error instanceof Error)) {
      logger.error('转让队长失败:', error);
    }

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '操作失败' }
    };
  }
}

export { resolveTransferTarget } from '@src/utils/teamTarget';
