import { getBackendBattleLeaderboard } from '@src/api/bot/battle-leaderboard-queries';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; page: number; regional?: boolean }) {
  try {
    const result = await getBackendBattleLeaderboard(params.bid, params.uid, params.page, params.regional);

    if (!result.access.ok || !result.leaderboard) {
      return { code: 'LOCKED' as const, data: { realmName: result.access.realmName ?? '未知' } };
    }

    return { code: 'OK' as const, data: { ...result.leaderboard, canUseSpar: result.access.canUseSpar } };
  } catch (error) {
    logger.error('[战力排行榜] 查询失败:', error);

    return { code: 'LOAD_FAILED' as const, data: { message: '查看战力排行榜失败，请稍后再试' } };
  }
}
