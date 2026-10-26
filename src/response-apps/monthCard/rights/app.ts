import { getBackendRechargeRights } from '@src/api/bot/recharge-rights-queries';
import { BackendAPIError } from '@src/api/bot/client';
import { projectRightsPanel, type RightsResult } from '@src/api/bot/membership-panels';
export type { RightsResult } from '@src/api/bot/membership-panels';
import { logger } from 'alemonjs';

/** 我的权益展示适配：游戏事实只来自 recharge/rights，文案与图片保留客户端。 */
export default async function App(params: { uid: number; avatarURL: string; bid?: string }): Promise<RightsResult> {
  const { uid, avatarURL, bid } = params;

  try {
    const data = await getBackendRechargeRights(bid, uid);

    return projectRightsPanel(data, avatarURL);
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 404) {
      return { code: 'INVALID_USER' };
    }
    logger.error('我的权益查询失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
