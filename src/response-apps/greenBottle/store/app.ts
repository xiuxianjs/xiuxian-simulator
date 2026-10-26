import { getBackendGreenBottleStorageCapacity } from '@src/api/bot/green-bottle-storage-capacity';
import { storeBackendGreenBottle } from '@src/api/bot/green-bottle-store';
import type { BackendRequestContext } from '@src/api/bot/context';

/** 解析存储数量参数 */
export function parseStoreParams(messageText: string) {
  return (messageText || '').replace(/^(!|！|\/|#|＃)?小绿瓶存储\s*/, '').trim();
}

/** 无参数展示读取服务端容量投影。 */
export function getStorageCapacity(bid: string | undefined, uid: number) {
  return getBackendGreenBottleStorageCapacity(bid, uid);
}

/** 执行服务端存储转换。 */
export function storeBottles(bid: string | undefined, uid: number, count: number, request?: BackendRequestContext) {
  return storeBackendGreenBottle(bid, uid, count, request);
}
