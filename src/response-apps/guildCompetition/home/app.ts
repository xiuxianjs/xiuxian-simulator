import { getBackendCompetitionHome } from '@src/api/bot/competition-read-projections';
import type { CompetitionHomeData } from '@src/api/bot/competition-read-projections';

type AppResult = { code: 'OK' | 'NO_GUILD'; data: CompetitionHomeData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<AppResult> {
  try {
    const data = await getBackendCompetitionHome(params.bid, params.uid);

    return { code: data.hasGuild ? 'OK' : 'NO_GUILD', data };
  } catch (error: unknown) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '获取宗门大比信息失败' } };
  }
}
