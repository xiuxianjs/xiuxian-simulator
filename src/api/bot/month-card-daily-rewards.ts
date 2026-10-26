import type {
  MonthCardDailyRewardClaimResult,
  MonthCardDailyRewardDefinition,
  MonthCardDailyRewardRecord,
  MonthCardDailyRewardStatusData
} from '../schemas/month-card-daily-rewards';

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function number(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(message);
  }

  return value;
}

function nonNegative(value: unknown, message: string): number {
  const parsed = number(value, message);

  if (parsed < 0) {
    throw new Error(message);
  }

  return parsed;
}

function positive(value: unknown, message: string): number {
  const parsed = number(value, message);

  if (parsed < 1) {
    throw new Error(message);
  }

  return parsed;
}

function rewardDefinition(value: unknown): MonthCardDailyRewardDefinition {
  const row = record(value, '月卡每日奖励响应不完整');

  return {
    spiritCrystal: nonNegative(row.spiritCrystal, '月卡每日奖励响应不完整'),
    mentalPillItemId: positive(row.mentalPillItemId, '月卡每日奖励响应不完整'),
    mentalPillQuantity: nonNegative(row.mentalPillQuantity, '月卡每日奖励响应不完整'),
    qiPillItemId: positive(row.qiPillItemId, '月卡每日奖励响应不完整'),
    qiPillQuantity: nonNegative(row.qiPillQuantity, '月卡每日奖励响应不完整')
  };
}

function rewardRecord(value: unknown): MonthCardDailyRewardRecord {
  const row = record(value, '月卡每日奖励响应不完整');
  const status = row.status;

  if ((status !== 'claimable' && status !== 'claimed' && status !== 'upcoming') || typeof row.rewardDate !== 'string') {
    throw new Error('月卡每日奖励响应不完整');
  }

  return { day: positive(row.day, '月卡每日奖励响应不完整'), rewardDate: row.rewardDate, status, prepaid: row.prepaid === true };
}

export function parseBackendMonthCardDailyRewards(value: unknown): MonthCardDailyRewardStatusData {
  const row = record(value, '月卡每日奖励响应不完整');

  if (!Array.isArray(row.records)) {
    throw new Error('月卡每日奖励响应不完整');
  }

  return {
    prepaidCount: nonNegative(row.prepaidCount ?? 0, '月卡每日奖励响应不完整'),
    reviewRequired: row.reviewRequired === true,
    total: nonNegative(row.total, '月卡每日奖励响应不完整'),
    claimableCount: nonNegative(row.claimableCount, '月卡每日奖励响应不完整'),
    claimedCount: nonNegative(row.claimedCount, '月卡每日奖励响应不完整'),
    upcomingCount: nonNegative(row.upcomingCount, '月卡每日奖励响应不完整'),
    dailyRewards: rewardDefinition(row.dailyRewards),
    records: row.records.map(rewardRecord)
  };
}

export function parseMonthCardClaimResult(value: unknown): MonthCardDailyRewardClaimResult {
  const row = record(value, '月卡领取响应不完整');
  const rewards = record(row.rewards, '月卡领取响应不完整');

  return {
    days: positive(row.days, '月卡领取响应不完整'),
    rewards: {
      spiritCrystal: nonNegative(rewards.spiritCrystal, '月卡领取响应不完整'),
      mentalPill: nonNegative(rewards.mentalPill, '月卡领取响应不完整'),
      qiPill: nonNegative(rewards.qiPill, '月卡领取响应不完整')
    }
  };
}
