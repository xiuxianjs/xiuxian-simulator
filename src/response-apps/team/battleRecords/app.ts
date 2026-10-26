import { getBackendTeamBattleRecords } from '@src/api/bot';
import { PAGE_SIZE } from '@src/constants';
import { logger } from 'alemonjs';

export type TeamBattleRecordsResult =
  | {
      code: 'OK';
      data: {
        records: Array<{
          id: number;
          teamId: number;
          leaderUserId: number;
          battleMode: string;
          targetLabel: string;
          battleResult: string;
          participantCount: number;
          battleLogId: string | null;
          settledAt: Date | null;
        }>;
        currentPage: number;
        totalPages: number;
        total: number;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; page: number }): Promise<TeamBattleRecordsResult> {
  try {
    const result = await getBackendTeamBattleRecords(params.bid, params.page, PAGE_SIZE);

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    logger.error('查询队伍战斗记录失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询失败' }
    };
  }
}
