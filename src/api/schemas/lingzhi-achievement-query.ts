import type { GeneralAchievementQueryData } from './general-achievement-query';

export interface LingzhiAchievementQueryData {
  items: (GeneralAchievementQueryData['items'][number] & {
    threshold: number;
    currentValue: number | null;
    claimable: boolean;
  })[];
  itemNames: GeneralAchievementQueryData['itemNames'];
}
