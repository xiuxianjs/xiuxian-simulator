import { BackendAPIError, getBackendEncyclopediaDetail } from '@src/api';
import type { EncyclopediaDetailFacts } from '@src/api/schemas/encyclopedia';

const COMMAND_PREFIX = /^(!|！|\/|#|＃)?图鉴详情\s*/;

export interface ParsedDetailCommand {
  category: string | null;
  targetId: number | null;
}

export function parseDetailCommand(messageText: string): ParsedDetailCommand {
  const raw = (messageText ?? '').trim().replace(COMMAND_PREFIX, '').trim();
  const m = raw.match(/^(道具|材料|装备|天工|功法|本命|本命物)\s+(\d+)$/);

  if (!m) {
    return { category: null, targetId: null };
  }

  return { category: m[1], targetId: Number(m[2]) };
}

type DetailResult =
  | { code: 'OK'; data: { category: string; record: any; grade: any; facts: EncyclopediaDetailFacts } }
  | { code: 'NOT_FOUND'; data: { message: string } }
  | { code: 'INVALID'; data: { message: string } };

export async function getEncyclopediaDetail(category: string, targetId: number, bid?: string): Promise<DetailResult> {
  const labels: Record<string, string> = { 道具: '道具/材料', 材料: '道具/材料', 装备: '装备', 天工: '天工', 功法: '功法', 本命: '本命物', 本命物: '本命物' };

  if (!labels[category]) {
    return { code: 'INVALID', data: { message: `未知分类「${category}」` } };
  }
  try {
    return { code: 'OK', data: await getBackendEncyclopediaDetail(bid, category, targetId) };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 404) {
      return { code: 'NOT_FOUND', data: { message: `未找到 ID 为 ${targetId} 的${labels[category]}` } };
    }
    throw error;
  }
}
