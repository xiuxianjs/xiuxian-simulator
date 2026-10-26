import { getBackendProfessionDashboard } from '@src/api/bot/profession-dashboard-query';
import type { ProfessionDashboardQueryData } from '@src/api/schemas/profession-dashboard-query';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type MyProfessionResult = CodeResult<'OK', 'LOAD_FAILED', ProfessionDashboardQueryData>;

export default async function App(params: { bid: string | undefined; uid: number }): Promise<MyProfessionResult> {
  try {
    return { code: 'OK', data: await getBackendProfessionDashboard(params.bid, params.uid) };
  } catch (error) {
    logger.error('获取职业信息失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
