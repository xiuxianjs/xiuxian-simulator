import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { GuildShopPageData } from '@src/api/schemas/guild-shop-page';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { cost: number; remainingRefreshCount: number; items: any[]; page?: GuildShopPageData; pageError?: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; repeatCommand?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'shop_refresh' }, params.request, params.repeatCommand);

    return {
      code: 'OK',
      data: { cost: result.receipt.cost, remainingRefreshCount: result.receipt.remaining, items: [], page: result.page, pageError: result.pageError }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '刷新商店失败' } };
  }
}
