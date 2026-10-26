import { marketWorkflow } from '@src/api/bot/market-community-views';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendMarketSellable } from '@src/api/bot/market-trade';
import type { MarketCategoryKey } from '@src/constants/marketCategories';

const marketCategory = (key: MarketCategoryKey) => (key.type === 'prop' || key.type === 'material' ? 'item' : key.type);

const assetDisplayType = (key: MarketCategoryKey) => {
  if (key.type === 'equipment') {
    return 'equipment';
  }
  if (key.type === 'profession_tool') {
    return 'professionTool';
  }
  if (key.type === 'skill_book') {
    return 'skillBook';
  }

  return 'item';
};

type ListResult = { code: 'OK'; data: { items: any[]; total: number; totalPages: number } } | { code: 'LOAD_FAILED'; data: { message: string } };

export async function fetchSellableList(params: { bid?: string; uid: number; categoryKey: MarketCategoryKey; page: number }): Promise<ListResult> {
  try {
    const page = await getBackendMarketSellable(params.bid, params.uid, {
      category: params.categoryKey.type,
      subtype: params.categoryKey.subtype,
      page: params.page,
      pageSize: 10
    });

    // Display-only adapter: eligibility, inventory visibility and pagination
    // are settled by Go before this response layer receives the records.
    return {
      code: 'OK',
      data: {
        total: page.total,
        totalPages: page.totalPages,
        items: page.items.map(item => ({
          ...item,
          ...item.attributes,
          id: item.userItemId,
          type: assetDisplayType(params.categoryKey),
          priceRange: item.priceRange ? { min: item.priceRange.minPrice, max: item.priceRange.maxPrice, ref: item.priceRange.referencePrice } : undefined
        }))
      }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '查看上架物品列表失败，请稍后再试' } };
  }
}

type PriceRangeResult =
  | {
      code: 'OK';
      submission?: SubmitResult;
      data: {
        minPrice: number;
        maxPrice: number;
        refPrice: number;
        source: 'median' | 'base_price' | 'fallback';
        isAboveThreshold: boolean;
        maxListingQuantity: number;
        fixedQuantity: boolean;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export async function fetchPriceRange(params: {
  bid?: string;
  uid: number;
  userItemId: number;
  categoryKey: MarketCategoryKey;
  firstNumber?: number;
  secondNumber?: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<PriceRangeResult> {
  try {
    const result = await marketWorkflow(
      params.bid,
      params.uid,
      {
        action: 'sell',
        category: marketCategory(params.categoryKey),
        userItemId: params.userItemId,
        firstNumber: params.firstNumber,
        secondNumber: params.secondNumber
      },
      params.request,
      params.messageText
    );
    const range = result.range;

    if (!range) {
      throw new Error('市场上架规则响应不完整');
    }

    return {
      code: 'OK',
      submission: result.listingError
        ? { code: 'FAIL', data: { message: result.listingError.message, canAdjustListings: result.listingError.code === 'MARKET_ACTIVE_LISTING_LIMIT' } }
        : result.receipt
          ? { code: 'OK', data: { message: result.receipt.message, listingId: result.receipt.listingId } }
          : undefined,
      data: {
        minPrice: range.minPrice,
        maxPrice: range.maxPrice,
        refPrice: range.referencePrice,
        source: range.source,
        isAboveThreshold: range.credibilityReady,
        maxListingQuantity: range.maxListingQuantity,
        fixedQuantity: range.fixedQuantity
      }
    };
  } catch {
    return { code: 'LOAD_FAILED', data: { message: '市场上架规则加载失败，请稍后再试' } };
  }
}

type SubmitResult =
  | { code: 'FAIL'; data: { message: string; canAdjustListings: boolean } }
  | { code: 'OK'; data: { message: string; listingId?: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };
