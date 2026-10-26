import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { parseShopListArgs } from '@src/api/bot/catalog-query-reuse';
import { toCurrencyName } from '@src/constants';
import { Format } from 'alemonjs';
import { SHOP_META } from './meta';
import {
  getMarketSecondaryCategoryKey,
  isMarketFilterPrimaryLabel,
  isMarketSecondaryParentLabel,
  MARKET_FILTER_PRIMARY_LABELS,
  MARKET_PRIMARY_CATEGORY_KEYS,
  MARKET_SECONDARY_CATEGORY_LABELS
} from '@src/response/market/categories';

export interface ShopFilters {
  category?: string;
  subtype?: string;
  keyword?: string;
  availableOnly?: boolean;
  sort?: 'price_asc' | 'price_desc';
}

export function parseShopBrowseCommand(text: string, defaultShopCode?: string) {
  const tokens = text.trim().split(/\s+/);
  const searchIndex = tokens.indexOf('搜索');
  let keyword: string | undefined;
  let pageToken: string | undefined;

  if (searchIndex >= 0) {
    if (tokens.length > searchIndex + 2 && /^\d+$/.test(tokens.at(-1) ?? '')) {
      pageToken = tokens.pop();
    }
    keyword = tokens.splice(searchIndex + 1).join(' ');
    tokens.pop();
  }
  const parsed = parseShopListArgs(tokens.join(' '), defaultShopCode);

  if (pageToken) {
    parsed.page = Math.max(1, Number(pageToken));
  }
  const filters: ShopFilters = {};
  let categoryLabel = '全部';
  let secondaryLabel: string | undefined;
  let error: string | undefined;

  const categoryIndex = tokens.indexOf('筛选');
  const primary = tokens[categoryIndex + 1];

  if (categoryIndex >= 0 && primary) {
    if (primary === '兑换') {
      filters.category = 'currency';
      categoryLabel = primary;
    } else if (isMarketFilterPrimaryLabel(primary)) {
      filters.category = MARKET_PRIMARY_CATEGORY_KEYS[primary]?.type;
      categoryLabel = primary;
      const secondary = tokens[categoryIndex + 2];

      if (isMarketSecondaryParentLabel(primary) && MARKET_SECONDARY_CATEGORY_LABELS[primary].some(label => label === secondary)) {
        const key = getMarketSecondaryCategoryKey(primary, secondary);

        filters.subtype = key?.subtype;
        secondaryLabel = secondary;
      }
    } else {
      error = '未找到这个商品分类';
    }
  }
  if (searchIndex >= 0) {
    if (!keyword) {
      error = '请输入商品名称';
    } else {
      filters.keyword = keyword;
    }
  }
  if (tokens.includes('可购')) {
    filters.availableOnly = true;
  }
  if (tokens.includes('价格升序')) {
    filters.sort = 'price_asc';
  }
  if (tokens.includes('价格降序')) {
    filters.sort = 'price_desc';
  }
  if (filters.sort && !parsed.currencyCode) {
    error = '请先选择币种，再按价格排序';
  }

  return { ...parsed, filters, categoryLabel, secondaryLabel, error };
}

type ShopSelection = ReturnType<typeof parseShopBrowseCommand>;
export function buildShopBrowseCommand(selection: ShopSelection, patch: Partial<ShopSelection> = {}, page: number | string = 1) {
  const next = { ...selection, ...patch };
  const tokens = [next.shopCode ? `/${SHOP_META[next.shopCode]?.listCmd ?? '商店'}` : '/商店'];

  if (next.currencyCode) {
    tokens.push(toCurrencyName(next.currencyCode));
  }
  if (next.categoryLabel !== '全部') {
    tokens.push('筛选', next.categoryLabel, ...(next.secondaryLabel ? [next.secondaryLabel] : []));
  }
  if (next.filters.availableOnly) {
    tokens.push('可购');
  }
  if (next.filters.sort) {
    tokens.push(next.filters.sort === 'price_asc' ? '价格升序' : '价格降序');
  }
  if (next.filters.keyword) {
    tokens.push('搜索', next.filters.keyword);
  }

  return [...tokens, String(page)].join(' ');
}

export function appendShopSearch(md: ReturnType<typeof Format.createMarkdown>, selection: ShopSelection) {
  md.addButton(markdownButtonLabel('搜索'), {
    data: buildShopBrowseCommand(selection, { filters: { ...selection.filters, keyword: undefined } }).replace(/ 1$/, ' 搜索 '),
    autoEnter: false
  });
  if (selection.filters.keyword) {
    md.addText(` ${selection.filters.keyword}`);
  }
  md.addNewline();
}

export function createShopCategoryFooter(selection: ShopSelection) {
  return MARKET_FILTER_PRIMARY_LABELS.map(label => ({
    label,
    selected: selection.categoryLabel === label,
    command: buildShopBrowseCommand(selection, { categoryLabel: label, secondaryLabel: undefined })
  }));
}
