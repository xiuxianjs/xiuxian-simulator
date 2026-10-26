import { setBackendStorageLock } from '@src/api/bot/storage-lock';
import type { BackendRequestContext } from '@src/api/bot/context';
import { storageLockSelector } from '@src/utils/storage-lock-view';
import type { StorageLockInput, StorageLockView } from '@src/utils/storage-lock-view';
import { logger } from 'alemonjs';

export type StorageLockResult = { code: 'OK'; data: StorageLockView } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(
  params: StorageLockInput & {
    uid: number;
    bid?: string;
    request?: BackendRequestContext;
  }
): Promise<StorageLockResult> {
  try {
    const selector = storageLockSelector(params);

    if (!('kind' in selector)) {
      return { code: 'OK', data: selector };
    }
    const result = await setBackendStorageLock(params.bid, params.uid, { locked: true, selector }, params.request);

    return { code: 'OK', data: result.view };
  } catch (error) {
    logger.error('锁定物品失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '锁定失败' } };
  }
}
