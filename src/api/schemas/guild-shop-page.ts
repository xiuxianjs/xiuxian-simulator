export interface GuildShopPageItem {
  id: number;
  index: number;
  itemId: number;
  name: string;
  category: string;
  quantity: number | bigint;
  priceContribution: number | bigint;
  purchased: boolean;
  statusText: string;
  canExchange: boolean;
  slotName?: string;
  locked?: boolean;
  itemType: string | null;
  itemSubtype: string | null;
}
export interface GuildShopPageData {
  contributionPoints: number | bigint;
  items: GuildShopPageItem[];
  autoRefreshEnabled: boolean;
  autoRefreshHours: number[];
  autoRefreshStatusText: string;
  refreshDailyLimit: number;
  isLeader: boolean;
}
