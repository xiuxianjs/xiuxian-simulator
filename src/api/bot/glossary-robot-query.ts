import { parseGlossaryView } from './market-community-views';
import { isSearchReference } from '@src/utils/searchReference';

/** 解析词典查询参数 */
export function parseQueryParams(messageText: string): { keyword: string | null; page: number; searchReference?: string } {
  const raw = (messageText ?? '').trim();
  const continuation = raw.match(/^(!|！|\/|#|＃)?词典\s+续查\s+(\S+)\s+p([1-9]\d{0,15})$/);

  if (continuation && isSearchReference(continuation[2]) && Number.isSafeInteger(Number(continuation[3]))) {
    return { keyword: null, page: Number(continuation[3]), searchReference: continuation[2] };
  }
  const m = raw.match(/^(!|！|\/|#|＃)?词典(?:\s+(.+?))?(?:\s*p(\d+))?$/);
  const keyword = m?.[2]?.trim() ?? null;
  const page = m?.[3] ? Number(m[3]) : 1;

  return { keyword, page };
}

/** 解析词典分类参数 */
export function parseCategoryParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const m = raw.match(/^(!|！|\/|#|＃)?词典分类(?:\s+(\S+))?(?:\s*p(\d+))?$/);
  const category = m?.[2]?.trim() ?? null;
  const page = m?.[3] ? Number(m[3]) : 1;

  return { category, page };
}

export function parseRobotGlossaryView(value: unknown, action: 'browse' | 'search' | 'category') {
  const data = parseGlossaryView(value as Parameters<typeof parseGlossaryView>[0], action);

  if ((action === 'browse' || (action === 'search' && !data.exact) || (action === 'category' && data.policy?.categoryValid)) && !data.page) {
    throw new Error('词典分页响应不完整');
  }

  const ref = (value as { searchReference?: unknown }).searchReference;

  return { ...data, ...(isSearchReference(ref) ? { searchReference: ref } : {}) };
}
