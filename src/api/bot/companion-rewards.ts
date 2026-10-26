import { parseDailyCheckIn } from './daily-checkin';
import { parseMonthCardClaimResult } from './month-card-daily-rewards';

function partner(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣代领响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.partnerId !== 'number' || !Number.isSafeInteger(row.partnerId) || row.partnerId < 1 || typeof row.partnerName !== 'string') {
    throw new Error('道侣代领响应不完整');
  }

  return row;
}

export function parseCompanionDailyReward(value: unknown): string[] {
  const row = partner(value);
  const daily = parseDailyCheckIn(row.dailyCheckIn);

  return [
    `已为道侣 ${row.partnerName}（UID ${row.partnerId}）完成日常签到`,
    `对方本月累计签到：${daily.accumulatedDays} 天`,
    ...daily.issued.map(reward => `${reward.name} ×${reward.amount}`),
    '奖励已发放至道侣账户'
  ];
}

export function parseCompanionMonthCardReward(value: unknown): string[] {
  const row = partner(value);
  const claim = parseMonthCardClaimResult(row.monthCard);

  return [
    `已为道侣 ${row.partnerName}（UID ${row.partnerId}）领取 ${claim.days} 天月卡奖励`,
    `灵晶 ×${claim.rewards.spiritCrystal}`,
    `精力丹 ×${claim.rewards.mentalPill}`,
    `元力丹 ×${claim.rewards.qiPill}`,
    '奖励已发放至道侣账户'
  ];
}
