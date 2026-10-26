import { getBackendTianshiBaoluPanel, type TianshiBaoluCategoryKey, type TianshiBaoluPanelData } from '@src/api/bot/tianshi-baolu-panel';
import { logger } from 'alemonjs';

export type { TianshiBaoluCategoryKey } from '@src/api/bot/tianshi-baolu-panel';

export const TIANSHI_BAOLU_CATEGORY_MAP: Record<string, TianshiBaoluCategoryKey> = {
  全部: 'all',
  装备: 'equipment_set',
  功法: 'skill_book',
  本命: 'soul_artifact'
};

export type ParsedTianshiBaoluCommand = {
  category: TianshiBaoluCategoryKey;
  categoryLabel: string;
  page: number;
};

export const parseTianshiBaoluCommand = (messageText: string): ParsedTianshiBaoluCommand => {
  const raw = (messageText ?? '').trim();
  const match = raw.match(/^(!|！|\/|#|＃)?天师宝录(?:\s+(\S+))?(?:\s+p(\d+))?$/);
  const rawCategory = match?.[2] ?? '';
  const pageFromCategory = rawCategory.match(/^p(\d+)$/);
  const categoryLabel = pageFromCategory ? '全部' : rawCategory || '全部';
  const category = TIANSHI_BAOLU_CATEGORY_MAP[categoryLabel] ?? 'all';
  const page = Math.max(1, Number(match?.[3] ?? pageFromCategory?.[1] ?? 1));

  return { category, categoryLabel: category === 'all' ? '全部' : categoryLabel, page };
};

type TianshiBaoluResult = { code: 'OK'; data: TianshiBaoluPanelData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid: string | undefined;
  uid: number;
  category: TianshiBaoluCategoryKey;
  page: number;
}): Promise<TianshiBaoluResult> {
  try {
    const data = await getBackendTianshiBaoluPanel(params.bid, params.uid, params.category, params.page);

    return { code: 'OK', data };
  } catch (error) {
    logger.error('[天师宝录] 查询失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看天师宝录失败，请稍后再试' } };
  }
}
