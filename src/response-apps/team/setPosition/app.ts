import { requestTeamWorkflow } from '@src/api/bot/social-workflows';
import type { TargetSelector } from '@src/api/schemas/social-workflows';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_TEAM } from '@src/constants/messages';
import { logger } from 'alemonjs';

export type SetPositionResult = { code: 'OK' } | { code: 'TARGET_MISSING' } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  selector: TargetSelector;
  position: number;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<SetPositionResult> {
  try {
    const result = await requestTeamWorkflow(
      params.bid,
      params.uid,
      { action: 'position', ...params.selector, position: params.position },
      params.request,
      params.repeatCommand
    );

    if (!('outcome' in result)) {
      throw new Error('队伍操作响应不完整');
    }
    if (result.outcome === 'target_missing') {
      return { code: 'TARGET_MISSING' };
    }
    if (result.outcome !== 'updated') {
      const messages = {
        invalid_position: '位置必须在1-6之间',
        not_in_team: MSG_TEAM.NOT_IN_TEAM,
        not_leader: MSG_TEAM.NOT_LEADER,
        target_not_in_team: MSG_TEAM.TARGET_NOT_IN_TEAM,
        same_position: MSG_TEAM.MEMBER_SAME_POSITION
      };

      return { code: 'LOAD_FAILED', data: { message: messages[result.outcome as keyof typeof messages] } };
    }

    return { code: 'OK' };
  } catch (error) {
    logger.error('设置队伍位置失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '设置失败' }
    };
  }
}

export { resolvePositionTarget } from '@src/utils/teamTarget';
