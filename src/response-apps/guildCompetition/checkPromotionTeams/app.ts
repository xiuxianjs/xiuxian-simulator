import { getBackendPromotionTeams, type CompetitionPromotionTeam } from '@src/api/bot/competition-read-projections';
type AppResult = { code: 'OK'; data: { teams: CompetitionPromotionTeam[] } } | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: { bid?: string }): Promise<AppResult> {
  try {
    const data = await getBackendPromotionTeams(params.bid);

    return { code: 'OK', data };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询晋级赛队伍失败' } };
  }
}
