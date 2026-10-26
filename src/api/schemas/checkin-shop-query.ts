export interface CheckInShopQueryData {
  signInCoin: number;
  products: {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    monthlyLimit: number;
    bought: number;
    remaining: number;
    canBuy: boolean;
  }[];
}
