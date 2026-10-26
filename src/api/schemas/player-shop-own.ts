export type PlayerShopEnsureResult = { ensured: boolean };
export type PlayerShopOwnQueryData = {
  shopId: number;
  userId: number;
  ownerName: string | null;
  shopName: string | null;
  description: string | null;
  heatScore: number;
  totalSales: number;
  totalVolume: number;
  level: number | null;
  levelName: string;
  status: number | null;
  activeListings: number;
};
