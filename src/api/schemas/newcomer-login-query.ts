export interface NewcomerLoginQueryData {
  isInPeriod: boolean;
  currentDayIndex: number;
  daysSinceRegistration: number;
  registrationTime: number;
  claimedLoginDays: number[];
  claimedTaskIds: number[];
  taskProgress: Record<string, number>;
  guildContribution: number;
  dayConfigs: Array<{ dayIndex: number; spiritCrystal: number; itemIds: string | null; equipSetIds: string | null }>;
  taskConfigs: Array<{ id: number; dayIndex: number; taskKey: string; threshold: number; spiritCrystal: number; vipExpYuan: number; sortOrder: number }>;
  itemNames: Record<string, string | null>;
  periodMessage: string;
  view?: NewcomerLoginView;
}

export interface NewcomerLoginView {
  eventDays: number;
  contentDays: number;
  currentDayIndex: number;
  timeRange: string;
  nextUnlockText: string;
  signInCommand?: string;
  totalText: string;
  overviewDays: Array<{ day: number; theme: string; status: 'LOCKED' | 'MISSED' | 'AVAILABLE' | 'CLAIMED'; taskSummary: string; command?: string }>;
  detailDays: Array<{
    day: number;
    theme: string;
    flavor: string;
    status: 'LOCKED' | 'MISSED' | 'AVAILABLE' | 'CLAIMED';
    configExists: boolean;
    rewardText: string;
    rewardStatus: string;
    tasks: Array<{
      label: string;
      progressText: string;
      milestones: Array<{ text: string; status: 'LOCKED' | 'CLAIMABLE' | 'CLAIMED'; command?: string }>;
    }>;
  }>;
}
