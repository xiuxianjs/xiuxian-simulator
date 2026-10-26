import type { ActivityPointsQueryData } from './activity-points-query';
import type { CompanionPanelStatusQueryData } from './companion-panel-status-query';
import type { LimitedEventOverviewQueryItem } from './event-overview-query';
import type { MonthCardDailyRewardStatusData } from './month-card-daily-rewards';
import type { LimitedEventCheckinStatus } from '@src/api/bot/limited-event-checkin-status';

/** Pure facts shared by already-audited task-panel tabs. Presentation stays in the bot. */
export interface TaskPanelSnapshotQueryData {
  event: {
    limitedEvents: LimitedEventOverviewQueryItem[];
    monthCard: { isActive: boolean };
    monthCardDaily: MonthCardDailyRewardStatusData;
    unreadEmailCount: number;
    playerCreatedAt: string | null;
    newcomerEvent: { visible: boolean; currentDayIndex: number };
  };
  activity: {
    daily: ActivityPointsQueryData;
    weekly: ActivityPointsQueryData;
  };
  companion: CompanionPanelStatusQueryData;
  autoTask: {
    slotCount: number;
    configuredSlots: number;
    emptySlots: number;
    isMonthCard: boolean;
    runtime: null | { slot: number; alias: string; currentStep: number; totalSteps: number };
  };
  checkIn: {
    limitedEventCheckins: LimitedEventCheckinStatus[];
    nativeComeback: null | {
      enabled: boolean;
      current: null | { status: string; signIn: { canClaimToday: boolean } };
    };
  };
  cultivation: {
    meditation: { active: boolean };
    seclusion: { inSeclusion: boolean; startAvailable: boolean; startReason?: string; canEnd: boolean; endReason?: string };
    breakthrough: { experience: number; requiredExperience: number; canBreak: boolean; reason?: string };
    meridian: { trueQi: number; pulseQiCost: number; canPulse: boolean; reason?: string; locked: boolean; dailyPulseRemaining: number };
    alchemy: { unlocked: boolean; learnedRecipeCount: number; canCraft: boolean };
  };
  dungeon: {
    secretRealm: { available: boolean; mentalValue: number; canChallenge: boolean; reason?: string };
    storyline: { available: boolean; hasProgress: boolean; latestChapterNumber: number; clearedCount: number; stageCount: number };
    demonTower: { available: boolean; hasStarted: boolean; isFinished: boolean; currentLayer: number; canChallenge: boolean };
    worldBoss: { available: boolean; isActive: boolean; canChallenge: boolean; remainingAttempts: number; activeTimeDesc?: string; reason?: string };
    tianjiao: { available: boolean; isVisible: boolean; canChallenge: boolean; attemptsLeft: number; requiredRealmName: string; requiredText?: string };
    tongtianTower: { isOpen: boolean; reason?: string };
  };
  guild: {
    membershipStatus: 'not_joined' | 'joined';
    checkIn: { done: boolean; canCheckIn: boolean };
    daily: { activity: number; hasActivity: boolean };
    worship: { available: boolean; reason?: string };
    mining: { available: boolean; reason?: string };
    competition: { materialized: boolean; phase: string; available: boolean; reason?: string };
    secretRealmWar: { isActive: boolean };
  };
}
