import { getBackendGlossaryPolicy } from '@src/api/bot/glossary-upsert';
import { getBackendGlossary } from '@src/api/bot/glossary-queries';

/** 解析词典分类参数 */
export function parseCategoryParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const m = raw.match(/^(!|！|\/|#|＃)?词典分类(?:\s+(\S+))?(?:\s*p(\d+))?$/);
  const category = m?.[2]?.trim() ?? null;
  const page = m?.[3] ? Number(m[3]) : 1;

  return { category, page };
}

export const getGlossaryPolicy = getBackendGlossaryPolicy;

/** 获取分类词条列表 */
export function getCategoryEntries(page: number, category: string, bid?: string) {
  return getBackendGlossary(bid, page, { category });
}
