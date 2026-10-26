import { getBackendGlossaryPolicy } from '@src/api/bot/glossary-upsert';
import { getBackendGlossary, getBackendGlossaryEntry } from '@src/api/bot/glossary-queries';

/** 解析词典查询参数 */
export function parseQueryParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const m = raw.match(/^(!|！|\/|#|＃)?词典(?:\s+(.+?))?(?:\s*p(\d+))?$/);
  const keyword = m?.[2]?.trim() ?? null;
  const page = m?.[3] ? Number(m[3]) : 1;

  return { keyword, page };
}

/** 获取最近词条列表 */
export function getEntryList(page: number, bid?: string) {
  return getBackendGlossary(bid, page);
}

/** 精确查询词条 */
export function getExactEntry(keyword: string, bid?: string) {
  return getBackendGlossaryEntry(bid, keyword);
}

/** 模糊搜索词条 */
export function searchEntries(keyword: string, page: number, bid?: string) {
  return getBackendGlossary(bid, page, { keyword });
}

export const getGlossaryPolicy = getBackendGlossaryPolicy;
