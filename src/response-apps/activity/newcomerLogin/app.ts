import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendNewcomerLogin } from '@src/api/bot/newcomer-login-queries';
import type { NewcomerLoginView } from '@src/api/schemas/newcomer-login-query';
import { logger } from 'alemonjs';

export type NewcomerLoginPageResult =
  { code: 'OK'; data: NewcomerLoginView } | { code: 'OUT_OF_PERIOD'; message: string } | { code: 'INVALID_USER' | 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid?: number; request?: BackendRequestContext }): Promise<NewcomerLoginPageResult> {
  if (!params.uid) {
    return { code: 'INVALID_USER' };
  }

  try {
    const status = await getBackendNewcomerLogin(params.bid, params.uid, params.request);

    if (!status.isInPeriod) {
      return { code: 'OUT_OF_PERIOD', message: status.periodMessage };
    }

    if (!status.view) {
      throw new Error('新人活动展示投影不完整');
    }

    return { code: 'OK', data: status.view };
  } catch (error) {
    logger.error('查询新人狂欢状态失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
