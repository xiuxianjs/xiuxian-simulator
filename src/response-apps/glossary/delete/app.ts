import { deleteBackendGlossary, getBackendGlossaryEditPermission } from '@src/api/bot/glossary-delete';
import type { BackendRequestContext } from '@src/api/bot/context';

export function checkDeleteWhitelist(bid: string | undefined) {
  return getBackendGlossaryEditPermission(bid);
}

/** 解析删除参数 */
export function parseDeleteParams(messageText: string) {
  const raw = (messageText ?? '').trim();

  return raw.replace(/^(!|！|\/|#|＃)?删除词典\s*/, '').trim();
}

export async function deleteEntry(bid: string | undefined, keyword: string, request?: BackendRequestContext) {
  const result = await deleteBackendGlossary(bid, keyword, request);

  if (result.outcome === 'deleted') {
    return { success: true, forbidden: false };
  }
  const reason = result.outcome === 'rewarded' ? '该词条已发放奖励，不可删除，但仍可继续修改' : '词条不存在或已被删除';

  return { success: false, forbidden: result.outcome === 'forbidden', reason };
}
