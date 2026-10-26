import { getBackendCompetitionBattleDetail, type CompetitionBattleDetailData } from '@src/api/bot/competition-read-projections';
type AppResult = { code: 'OK'; data: CompetitionBattleDetailData } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { bid?: string; uid: number; battleId: number }): Promise<AppResult> {
  try {
    if (!params.battleId) {
      return { code: 'LOAD_FAILED', data: { message: '请提供战斗记录ID' } };
    }
    const data = await getBackendCompetitionBattleDetail(params.bid, params.uid, params.battleId);

    return { code: 'OK', data };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '获取战斗详情失败' } };
  }
}
