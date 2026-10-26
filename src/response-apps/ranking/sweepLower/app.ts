import { BackendAPIError } from '@src/api/bot/client';
import { getBackendTongtianTower, sweepBackendTongtianTower, type BackendTongtianEntry, type BackendTongtianSweep } from '@src/api/bot/tongtian-tower';
import type { BackendRequestContext } from '@src/api/bot/context';

export type SweepLowerResult =
  | { code: 'LIST'; data: { myRank: number; entries: BackendTongtianEntry[] } }
  | { code: 'LIST_EMPTY' }
  | { code: 'SWEEP'; data: BackendTongtianSweep }
  | { code: 'FAILED'; uid: number; message: string; needPotion?: boolean };
export default async function App(params: { uid: number; bid?: string; messageText: string; request?: BackendRequestContext }): Promise<SweepLowerResult> {
  const match = (params.messageText || '').match(/扫荡排名\s+(\d+)(?:\s+(\d+))?\s*$/);

  try {
    if (!match) {
      const view = await getBackendTongtianTower(params.bid, params.uid);

      if (!view.isOpen) {
        return { code: 'FAILED', uid: params.uid, message: view.message ?? '通天塔暂未开放' };
      }

      return view.sweepTargets.length ? { code: 'LIST', data: { myRank: view.myRank, entries: view.sweepTargets } } : { code: 'LIST_EMPTY' };
    }

    return { code: 'SWEEP', data: await sweepBackendTongtianTower(params.bid, params.uid, Number(match[1]), Number(match[2] ?? 5), params.request) };
  } catch (error) {
    const message = error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : '扫荡排名失败，请稍后再试';

    return { code: 'FAILED', uid: params.uid, message, needPotion: error instanceof BackendAPIError && error.code === 'TONGTIAN_INSUFFICIENT_QI' };
  }
}
