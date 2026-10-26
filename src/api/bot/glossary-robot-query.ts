import { parseGlossaryView } from './market-community-views';

/** 解析词典查询参数 */
export function parseQueryParams(messageText: string) {
  const raw = (messageText ?? '').trim();
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

  return data;
}
