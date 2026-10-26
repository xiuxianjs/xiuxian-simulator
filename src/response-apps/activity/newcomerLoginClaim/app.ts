import { claimBackendNewcomerLogin } from '@src/api/bot/newcomer-login-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type NewcomerLoginClaimData = { claimDay: number; spiritCrystal: number; grantedItems: string[] };
export type NewcomerLoginClaimResult = CodeResult<
  'OK',
  'INVALID_USER' | 'OUT_OF_PERIOD' | 'ALL_CLAIMED' | 'NO_CLAIMABLE' | 'ALREADY_CLAIMED' | 'NOT_UNLOCKED' | 'EXPIRED' | 'CONFIG_MISSING' | 'CLAIM_FAILED',
  NewcomerLoginClaimData
>;

export default async function App(params: { bid?: string; uid?: number; request?: BackendRequestContext }): Promise<NewcomerLoginClaimResult> {
  if (!params.uid) {
    return { code: 'INVALID_USER' };
  }
  try {
    const result = await claimBackendNewcomerLogin(params.bid, params.uid, params.request);
    const code = result.code as NewcomerLoginClaimResult['code'];

    if (code !== 'OK') {
      return { code };
    }
    if (!Number.isInteger(result.claimDay) || !Number.isFinite(result.spiritCrystal) || !result.grantedItems) {
      throw new Error('新人登录领奖响应不完整');
    }

    return { code: 'OK', data: { claimDay: result.claimDay as number, spiritCrystal: result.spiritCrystal as number, grantedItems: result.grantedItems } };
  } catch (error) {
    logger.error('领取新人登录奖励失败:', error);

    return { code: 'CLAIM_FAILED' };
  }
}
