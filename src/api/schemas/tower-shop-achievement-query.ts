import type { GeneralAchievementQueryData } from './general-achievement-query';
export interface TowerShopAchievementQueryData {
  totalStars: number;
  items: (GeneralAchievementQueryData['items'][number] & { threshold: number; claimable: boolean })[];
  itemNames: GeneralAchievementQueryData['itemNames'];
}
