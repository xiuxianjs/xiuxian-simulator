/**
 * 邀请人数奖励 - 数据层
 */
import { getBackendReferralOverview } from '@src/api/bot/referral-overview';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

interface RuleGroup {
  threshold: string;
  icon: string;
  tag: string;
  rewards: string[];
}

type CountRulesResult =
  | { code: 'FAILED' }
  | {
      code: 'OK';
      inviteCount: number;
      pendingCount: number;
      groups: RuleGroup[];
    };

export async function getCountRulesData(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<CountRulesResult> {
  try {
    const overview = await getBackendReferralOverview(bid, uid, request);
    const panel = overview.rulePanels.count;

    return {
      code: 'OK',
      inviteCount: overview.inviteCount,
      pendingCount: panel.pendingCount,
      groups: panel.groups
    };
  } catch (error) {
    logger.error('查看邀请人数奖励失败:', error);

    return { code: 'FAILED' };
  }
}
