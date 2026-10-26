import { buildGuildShopDisplay } from '@src/response/guild/shop/view';
import type { GuildShopPageData } from '@src/api/schemas/guild-shop-page';
import { getBackendGuildShopPage } from '@src/api/bot/guild-shop-page';

type ShopItem = {
  index: number;
  itemName: string;
  price: number;
  quantity: number;
  statusText: string;
  canExchange: boolean;
  categoryLabel: string;
};

type AppResult =
  | {
      code: 'OK';
      data: {
        shopItems: ShopItem[];
        contributionPoints: number;
        autoRefreshEnabled: boolean;
        autoRefreshHours: number[];
        autoRefreshStatusText: string;
        refreshDailyLimit: number;
        isLeader: boolean;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; page?: GuildShopPageData; pageError?: string }): Promise<AppResult> {
  try {
    if (params.pageError) {
      return { code: 'LOAD_FAILED', data: { message: params.pageError } };
    }
    const page = params.page ?? (await getBackendGuildShopPage(params.bid, params.uid));

    return { code: 'OK', data: buildGuildShopDisplay(page) };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取商店失败' } };
  }
}
