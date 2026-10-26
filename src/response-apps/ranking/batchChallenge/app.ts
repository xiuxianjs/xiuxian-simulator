import { BackendAPIError } from '@src/api/bot/client';
import { batchChallengeBackendTongtianTower, type BackendTongtianBatch } from '@src/api/bot/tongtian-tower';
import type { BackendRequestContext } from '@src/api/bot/context';

export type BatchChallengeResult = { code: 'OK'; data: BackendTongtianBatch } | { code: 'FAILED'; uid: number; message: string };
export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<BatchChallengeResult> {
  try {
    return { code: 'OK', data: await batchChallengeBackendTongtianTower(params.bid, params.uid, params.request) };
  } catch (error) {
    return {
      code: 'FAILED',
      uid: params.uid,
      message: error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : '连续爬塔失败，请稍后再试'
    };
  }
}
