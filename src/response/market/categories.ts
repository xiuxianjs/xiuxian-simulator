import { CHINESE_TO_CATEGORY_KEY, type MarketCategoryKey } from '@src/constants/marketCategories';

export type MarketFilterPrimaryLabel = '全部' | '道具' | '材料' | '装备' | '天工' | '功法' | '本命';
export type MarketSellPrimaryLabel = Exclude<MarketFilterPrimaryLabel, '全部'>;
export type MarketFilterSecondaryLabel = '丹药' | '礼物' | '其它' | '草药' | '经验材料';
export type MarketSecondaryParentLabel = '道具' | '材料';

export const MARKET_FILTER_PRIMARY_LABELS: MarketFilterPrimaryLabel[] = ['全部', '道具', '材料', '装备', '天工', '功法', '本命'];
export const MARKET_SELL_PRIMARY_LABELS: MarketSellPrimaryLabel[] = ['道具', '材料', '装备', '天工', '功法', '本命'];

export const MARKET_PRIMARY_CATEGORY_KEYS: Record<MarketFilterPrimaryLabel, MarketCategoryKey | undefined> = {
  全部: undefined,
  道具: { type: 'prop' },
  材料: { type: 'material' },
  装备: { type: 'equipment' },
  天工: { type: 'profession_tool' },
  功法: { type: 'skill_book' },
  本命: { type: 'soul_artifact' }
};

export const MARKET_SECONDARY_CATEGORY_LABELS: Record<MarketSecondaryParentLabel, MarketFilterSecondaryLabel[]> = {
  道具: ['丹药', '礼物', '其它'],
  材料: ['草药', '经验材料', '其它']
};

export const isMarketFilterPrimaryLabel = (value: string): value is MarketFilterPrimaryLabel => {
  return MARKET_FILTER_PRIMARY_LABELS.includes(value as MarketFilterPrimaryLabel);
};

export const isMarketSellPrimaryLabel = (value: string): value is MarketSellPrimaryLabel => {
  return MARKET_SELL_PRIMARY_LABELS.includes(value as MarketSellPrimaryLabel);
};

export const isMarketSecondaryParentLabel = (value: MarketFilterPrimaryLabel | MarketSellPrimaryLabel): value is MarketSecondaryParentLabel => {
  return value === '道具' || value === '材料';
};

export const getMarketSecondaryCategoryKey = (primaryCategory: MarketSecondaryParentLabel, secondaryCategory: string): MarketCategoryKey | null => {
  if (primaryCategory === '道具') {
    if (secondaryCategory === '丹药') {
      return CHINESE_TO_CATEGORY_KEY['丹药'];
    }
    if (secondaryCategory === '礼物') {
      return CHINESE_TO_CATEGORY_KEY['礼物'];
    }
    if (secondaryCategory === '其它') {
      return { type: 'prop', subtype: 'other' };
    }

    return null;
  }

  if (secondaryCategory === '草药') {
    return CHINESE_TO_CATEGORY_KEY['草药'];
  }
  if (secondaryCategory === '经验材料') {
    return CHINESE_TO_CATEGORY_KEY['经验材料'];
  }
  if (secondaryCategory === '其它') {
    return { type: 'material', subtype: 'other' };
  }

  return null;
};
