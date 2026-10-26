import { getBackendCurrentMonthBets } from '@src/api/bot/competition-bets-query';

type AppResult = { code: 'OK'; data: { bets: any[] } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<AppResult> {
  try {
    const result = await getBackendCurrentMonthBets(params.bid);
    const bets = result.bets;

    return { code: 'OK', data: { bets: bets ?? [] } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查询押注记录失败' } };
  }
}
