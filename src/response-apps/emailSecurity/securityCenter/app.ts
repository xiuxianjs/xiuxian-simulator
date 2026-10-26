/**
 * 安全中心 - 数据层
 */
import { getBackendSecurityProfile } from '@src/api';
import { logger } from 'alemonjs';

type SecurityCenterResult =
  | { code: 'NOT_FOUND' }
  | {
      code: 'OK';
      name: string;
      id: number;
      email: string | null;
      hasPassword: boolean;
    };

export async function getSecurityCenterData(uid: number, bid?: string): Promise<SecurityCenterResult> {
  try {
    if (!bid) {
      throw new Error('资料查询缺少平台身份');
    }
    const profile = await getBackendSecurityProfile(bid);
    const id = Number(profile.playerId);

    if (!Number.isInteger(id) || id !== uid) {
      return { code: 'NOT_FOUND' };
    }

    return {
      code: 'OK',
      name: String(profile.name ?? ''),
      id,
      email: profile.email ? String(profile.email) : null,
      hasPassword: profile.hasPassword === true
    };
  } catch (error) {
    logger.error('[安全中心] 错误:', error);

    return { code: 'NOT_FOUND' };
  }
}
