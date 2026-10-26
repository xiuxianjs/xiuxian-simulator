import { BackendAPIError } from '@src/api/bot/client';
import { getBackendTongtianTower, type BackendTongtianView } from '@src/api/bot/tongtian-tower';

export type ViewRankingsResult = { code: 'NO_MATCH' } | { code: 'FAILED'; message: string } | { code: 'MY_VIEW'; data: BackendTongtianView };
export default async function App(params: { uid: number; bid?: string; messageText: string }): Promise<ViewRankingsResult> {
  if (!/^(?:!|！|\/|#|＃)?(?:查看)?通天塔(?:\s+我的)?\s*$/.test(params.messageText || '')) {
    return { code: 'NO_MATCH' };
  }
  try {
    return { code: 'MY_VIEW', data: await getBackendTongtianTower(params.bid, params.uid) };
  } catch (error) {
    return {
      code: 'FAILED',
      message: error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : '通天塔加载失败，请稍后再试'
    };
  }
}
