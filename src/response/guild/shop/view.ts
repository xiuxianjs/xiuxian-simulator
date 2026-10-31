import { getItemCategoryLabel } from '@src/constants/marketCategories';
import type { GuildShopPageData } from '@src/api/schemas/guild-shop-page';

type ShopItem = {
  index: number;
  itemName: string;
  price: number | bigint;
  quantity: number | bigint;
  statusText: string;
  canExchange: boolean;
  categoryLabel: string;
  slotName: string;
  locked: boolean;
};

export function buildGuildShopDisplay(page: GuildShopPageData) {
  const shopItems: ShopItem[] = page.items.map(item => {
    let categoryLabel = '';

    if (item.category === 'item' && item.itemId) {
      categoryLabel = getItemCategoryLabel('item', item.itemType, item.itemSubtype);
    } else if (item.category) {
      categoryLabel = getItemCategoryLabel(item.category);
    }

    return {
      index: item.index,
      itemName: item.name,
      price: item.priceContribution,
      quantity: item.quantity,
      statusText: item.statusText,
      canExchange: item.canExchange,
      slotName: item.slotName ?? '',
      locked: item.locked === true,
      categoryLabel
    };
  });

  return {
    shopItems,
    contributionPoints: page.contributionPoints,
    autoRefreshEnabled: page.autoRefreshEnabled,
    autoRefreshHours: page.autoRefreshHours,
    autoRefreshStatusText: page.autoRefreshStatusText,
    refreshDailyLimit: page.refreshDailyLimit,
    isLeader: page.isLeader
  };
}
