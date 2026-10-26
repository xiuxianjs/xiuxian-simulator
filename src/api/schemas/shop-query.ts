/** Persisted public shop data; listing does not create shops or refresh heat. */
export interface PlayerShopQueryItem {
  shopId: number;
  userId: number;
  ownerName: string;
  shopName: string;
  description?: string | null;
  heatScore: number;
  totalSales: number;
  totalVolume: number;
  level: number;
  levelName: string;
  status: number;
  activeListings: number;
}

export interface PlayerShopQueryPage {
  nextCursor?: string;
  items: PlayerShopQueryItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface PlayerShopRankingQueryItem {
  rank: number;
  shopName: string;
  ownerName: string;
  heatScore: number;
  levelName: string;
  totalSales: number;
}
