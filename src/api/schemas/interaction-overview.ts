import type { CompanionInfoQueryData } from './companion-info-query';
import type { CompanionShopPurchasePreview } from '../bot/companion-shop-purchase';
import type { ShopPurchasePreview, ShopPurchaseSettlement } from '../bot/shop-purchase';
export type CompanionConfirmationOverviewData = {
  info: CompanionInfoQueryData;
  preview: { partnerId: number; partnerName: string; currentBlessingPercent: number; upgradedBlessingPercent: number } | null;
  mutation: { success: boolean; message: string; narrativeText: string } | null;
  mutationError?: string;
};
export type ShopPurchaseOverviewData = { preview: ShopPurchasePreview; result: ShopPurchaseSettlement | null; purchaseError?: string };
export type CompanionPurchaseOverviewData = { preview: CompanionShopPurchasePreview; result: ShopPurchaseSettlement | null; purchaseError?: string };
