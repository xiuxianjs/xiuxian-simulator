import { getBackendCompetitionBattles } from '@src/api/bot/competition-battle-queries';
import { competitionBattleView } from '@src/response/guildCompetition/battleLog/view';

export default async function App(params: { bid: string | undefined; uid: number; page: number }): Promise<ReturnType<typeof competitionBattleView>> {
  try {
    const data = await getBackendCompetitionBattles(params.bid, params.uid, params.page);

    return competitionBattleView(data);
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取战斗记录失败' } };
  }
}
