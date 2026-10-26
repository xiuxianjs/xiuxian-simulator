import { selectBackendDemonTowerBuff } from '@src/api/bot/demon-tower-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { DemonTowerBuffSelectionResult } from '@src/api/schemas/demon-tower-buff';

type BuffResult = { code: 'OK'; data: DemonTowerBuffSelectionResult } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; buffKey: string; count: number; request?: BackendRequestContext }): Promise<BuffResult> {
  try {
    return { code: 'OK', data: await selectBackendDemonTowerBuff(params.bid, params.uid, params.buffKey, params.count, params.request) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '选择 Buff 失败' } };
  }
}
