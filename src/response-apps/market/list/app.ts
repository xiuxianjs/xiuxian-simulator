import { getBackendMarketBrowse, type MarketBrowseSort } from '@src/api/bot/market-browse-query';
import type { MarketBrowseData } from '@src/api/schemas/market-browse-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { MarketCategoryKey } from '@src/constants/marketCategories';
import { logger } from 'alemonjs';

type MarketListResult = { code: 'OK'; data: MarketBrowseData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid: string | undefined;
  uid: number;
  categoryKey?: MarketCategoryKey;
  keyword?: string;
  sort?: MarketBrowseSort;
  page: number;
  request?: BackendRequestContext;
}): Promise<MarketListResult> {
  try {
    const data = await getBackendMarketBrowse(
      params.bid,
      params.uid,
      {
        categoryType: params.categoryKey?.type,
        categorySubtype: params.categoryKey?.subtype,
        keyword: params.keyword,
        sort: params.sort,
        page: params.page
      },
      params.request
    );

    return { code: 'OK', data };
  } catch (error) {
    logger.error('查看珍宝楼失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看珍宝楼失败，请稍后再试' } };
  }
}
