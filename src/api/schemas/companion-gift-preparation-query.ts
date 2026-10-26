export interface CompanionGiftTargetQueryData {
  /** null means no name validation was requested. */
  giftExists: boolean | null;
  directCategory?: string;
  friends: Array<{
    friendId: number;
    friendName: string;
    isCompanion: boolean;
  }>;
}

export interface CompanionGiftOptionsQueryData {
  targetFound: boolean;
  targetId: number;
  targetName: string | null;
  gifts: Array<{
    itemId: number;
    name: string;
    quantity: number;
    intimacy: number;
    isPremium: boolean;
  }>;
  dailyPremiumGiftUsed: number;
  dailyPremiumGiftLimit: number;
  weeklyIntimacyUsed: number;
  weeklyIntimacyLimit: number;
}
