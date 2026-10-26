/**
 * VIP等级奖励 - 数据层
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

type VipRulesResult =
  | { code: 'FAILED' }
  | {
      code: 'OK';
      inviteCount: number;
      pendingCount: number;
      groups: RuleGroup[];
    };

export async function getVipRulesData(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<VipRulesResult> {
  try {
    const overview = await getBackendReferralOverview(bid, uid, request);
    const panel = overview.rulePanels.vip_level;

    return {
      code: 'OK',
      inviteCount: overview.inviteCount,
      pendingCount: panel.pendingCount,
      groups: panel.groups
    };
  } catch (error) {
    logger.error('查看VIP等级奖励失败:', error);

    return { code: 'FAILED' };
  }
}
