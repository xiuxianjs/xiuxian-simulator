import type { CompanionInfoQueryData } from './companion-info-query';
export interface CompanionTasksQueryData {
  access: CompanionInfoQueryData['access'];
  hasCompanion: boolean;
  tasks: {
    taskType: 'dual_cultivation' | 'dungeon' | 'gift' | 'care_farm';
    limit: number;
    completedCount: number;
    earnedTongxin: number;
    rewardAmounts: number[];
  }[];
}
