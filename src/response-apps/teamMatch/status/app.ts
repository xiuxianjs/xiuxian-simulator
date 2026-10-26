import { getBackendTeamMatchSnapshot } from '@src/api/bot/team-match-queries';
import { logger } from 'alemonjs';

export type MatchStatusResult =
  | {
      code: 'OK';
      data: {
        targetLabel: string;
        waitedSeconds: number;
        timeoutSeconds: number;
        strategyText: string;
      };
    }
  | { code: 'NO_MATCH' }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string }): Promise<MatchStatusResult> {
  try {
    const result = await getBackendTeamMatchSnapshot(params.bid);

    if (!result) {
      return { code: 'NO_MATCH' };
    }

    return {
      code: 'OK',
      data: {
        targetLabel: result.targetLabel,
        waitedSeconds: result.waitedSeconds,
        timeoutSeconds: result.timeoutSeconds,
        strategyText: {
          WAITING: '等待同目标修士进入匹配池',
          SAME_REALM: '仅匹配同大境界修士',
          ADJACENT_REALM: '优先同大境界，其次相邻大境界',
          NEAREST_REALM: '放宽到同目标副本的最近大境界修士'
        }[result.phase]
      }
    };
  } catch (error) {
    logger.error('查询匹配状态失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: { message: error instanceof Error ? error.message : '查询匹配状态失败' }
    };
  }
}
