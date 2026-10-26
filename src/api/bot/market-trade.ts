import { requestBackend } from './client';

type Row = Record<string, unknown>;

export type BackendMarketSellableAsset = {
  userItemId: number;
  templateId: number;
  name: string;
  category: string;
  type?: string;
  subtype?: string | null;
  quantity: number;
  gradeId?: number | null;
  grade: string;
  realm: string;
  equipmentType?: string;
  typeName?: string;
  skillType?: string;
  config?: Record<string, unknown>;
  attributes?: Record<string, number>;
  priceRange?: BackendMarketPriceRange;
  currentLowestPrice: number | null;
};

export type BackendMarketSellablePage = {
  items: BackendMarketSellableAsset[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

export type BackendMarketPriceRange = {
  minPrice: number;
  maxPrice: number;
  referencePrice: number;
  source: 'median' | 'base_price' | 'fallback';
  credibilityReady: boolean;
  templateItemId: number;
  maxListingQuantity: number;
  fixedQuantity: boolean;
};

export type BackendMarketPurchasePreview = {
  listingId: number;
  itemName: string;
  quantity: number;
  totalPrice: number;
  currencyName: string;
  shouldConfirm: boolean;
  overpriceWarning: string;
};

const record = (value: unknown): Row | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function assertMarketPriceRange(value: unknown, message: string): asserts value is BackendMarketPriceRange {
  const range = record(value);

  if (
    !range ||
    !['minPrice', 'maxPrice', 'referencePrice', 'templateItemId', 'maxListingQuantity'].every(key => integer(range[key])) ||
    typeof range.source !== 'string' ||
    !['median', 'base_price', 'fallback'].includes(range.source) ||
    typeof range.credibilityReady !== 'boolean' ||
    typeof range.fixedQuantity !== 'boolean'
  ) {
    throw new Error(message);
  }
}

export async function getBackendMarketSellable(
  bid: string | undefined,
  uid: number,
  query: { category: string; subtype?: string; page: number; pageSize: number }
): Promise<BackendMarketSellablePage> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_market_sellable', { path: { id: uid }, query });

  return parseBackendMarketSellable(data);
}

export function parseBackendMarketSellable(data: unknown): BackendMarketSellablePage {
  const page = record(data);

  if (!page || !Array.isArray(page.items) || !['total', 'currentPage', 'pageSize', 'totalPages'].every(key => integer(page[key]) && Number(page[key]) >= 0)) {
    throw new Error('可上架物品响应不完整');
  }
  const items = page.items.map(value => {
    const item = record(value);
    const attributes = record(item?.attributes);

    if (
      !item ||
      !integer(item.userItemId) ||
      item.userItemId < 1 ||
      !integer(item.templateId) ||
      item.templateId < 1 ||
      typeof item.name !== 'string' ||
      typeof item.category !== 'string' ||
      (item.type !== undefined && typeof item.type !== 'string') ||
      !integer(item.quantity) ||
      item.quantity < 1 ||
      typeof item.grade !== 'string' ||
      typeof item.realm !== 'string' ||
      !(item.subtype === undefined || item.subtype === null || typeof item.subtype === 'string') ||
      !(item.gradeId === undefined || item.gradeId === null || integer(item.gradeId)) ||
      !(item.currentLowestPrice === null || finite(item.currentLowestPrice)) ||
      (item.equipmentType !== undefined && typeof item.equipmentType !== 'string') ||
      (item.typeName !== undefined && typeof item.typeName !== 'string') ||
      (item.skillType !== undefined && typeof item.skillType !== 'string') ||
      (item.config !== undefined && !record(item.config)) ||
      (item.attributes !== undefined && (!attributes || !Object.values(attributes).every(finite)))
    ) {
      throw new Error('可上架物品字段不完整');
    }

    if (item.priceRange !== undefined) {
      assertMarketPriceRange(item.priceRange, '可上架物品价格区间不完整');
    }

    return item as unknown as BackendMarketSellableAsset;
  });

  return {
    items,
    total: page.total as number,
    currentPage: page.currentPage as number,
    pageSize: page.pageSize as number,
    totalPages: page.totalPages as number
  };
}
