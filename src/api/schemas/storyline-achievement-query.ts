import type { GeneralAchievementQueryData } from './general-achievement-query';
export interface StorylineAchievementQueryData {
  totalStars: number;
  items: (GeneralAchievementQueryData['items'][number] & { threshold: number; claimable: boolean })[];
  itemNames: GeneralAchievementQueryData['itemNames'];
}
