import type { GeneralAchievementQueryData } from './general-achievement-query';

export interface MasterAchievementQueryData {
  items: (GeneralAchievementQueryData['items'][number] & { threshold: number; currentValue: number; claimable: boolean })[];
  itemNames: GeneralAchievementQueryData['itemNames'];
}
