import { parseBackendDungeonCatalog, parseBackendDungeonDetail } from './queries';
import { dungeonDetailView } from '@src/response/dungeon/detail/view';

export function dungeonCatalogArguments(text: string) {
  const match = text.trim().match(/^(!|！|\/|#|＃)?(查看秘境|秘境列表)\s*(\d+)?$/);
  const page = match?.[3] ? Math.max(1, Number(match[3])) : 1;

  return { pageText: String(page) };
}
export function dungeonDetailArguments(text: string) {
  const match = text.trim().match(/^(!|！|\/|#|＃)?秘境详情\s+(.+)$/);

  return { name: match?.[2] ? match[2].trim() : null };
}
export function parseRobotDungeonCatalog(value: unknown) {
  const data = parseBackendDungeonCatalog(value);

  return { code: data.pagination.total === 0 ? ('EMPTY' as const) : ('OK' as const), data };
}
export function parseRobotDungeonDetail(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('秘境详情响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result') {
    throw new Error('秘境详情响应不完整');
  }

  return { outcome: 'result' as const, data: dungeonDetailView(parseBackendDungeonDetail(row.data)) };
}
