import { requestBackend } from './client';
import {
  WEEKLY_CUMULATIVE_MODE,
  WEEKLY_CUMULATIVE_RULES,
  WEEKLY_CUMULATIVE_THRESHOLDS,
  type CumulativeWeeklyRebateQueryData,
  type WeeklyRebateQueryData
} from '../schemas/weekly-rebate-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('周周返利数据不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('周周返利缺少数值字段');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('周周返利缺少状态字段');
  }

  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('周周返利缺少列表');
  }

  return value;
}
function string(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('周周返利缺少展示字段');
  }

  return value;
}
export async function getBackendWeeklyRebate(bid: string | undefined, uid: number): Promise<WeeklyRebateQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendWeeklyRebate(await requestBackend(bid, 'get_players_id_recharge_weekly_rebate', { path: { id: uid } }));
}

export function parseBackendWeeklyRebate(value: unknown): WeeklyRebateQueryData {
  const data = record(value);

  if (data.mode === WEEKLY_CUMULATIVE_MODE) {
    return parseCumulativeWeeklyRebate(data);
  }
  if (data.mode !== undefined) {
    throw new Error('周周返利模式尚未支持，请刷新后再试');
  }

  if (typeof data.weekStart !== 'string') {
    throw new Error('周周返利缺少周期');
  }

  return {
    eligible: boolean(data.eligible),
    minAccountDays: number(data.minAccountDays),
    dailyThresholdAmount: number(data.dailyThresholdAmount),
    daysSinceRegistration: number(data.daysSinceRegistration),
    todayDayOfWeek: number(data.todayDayOfWeek),
    todayLabel: string(data.todayLabel),
    weekStart: data.weekStart,
    todayRechargedAmount: number(data.todayRechargedAmount),
    todayRechargedYuan: number(data.todayRechargedYuan),
    todayRechargeText: string(data.todayRechargeText),
    thresholdYuan: number(data.thresholdYuan),
    claimedDays: array(data.claimedDays).map(number),
    canClaimToday: boolean(data.canClaimToday),
    canClaimBonus: boolean(data.canClaimBonus),
    rewards: array(data.rewards).map(value => {
      const row = record(value);

      return {
        day: number(row.day),
        label: string(row.label),
        statusTag: string(row.statusTag),
        spiritStone: number(row.spiritStone),
        spiritCrystal: number(row.spiritCrystal),
        spiritMilk: number(row.spiritMilk),
        canClaim: boolean(row.canClaim),
        rewardText: string(row.rewardText),
        items: array(row.items).map(value => {
          const item = record(value);

          if (item.name !== null && typeof item.name !== 'string') {
            throw new Error('周周返利物品名称不完整');
          }

          return { itemId: number(item.itemId), quantity: number(item.quantity), name: item.name };
        })
      };
    })
  };
}

export function weeklyRebateWeekStart(value: unknown): string {
  const result = string(value);
  const parsed = new Date(`${result}T00:00:00Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new Error('周周返利缺少有效周期');
  }

  return result;
}

function amount(value: unknown): number {
  const result = number(value);

  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error('周周返利金额或奖励数量不完整');
  }

  return result;
}

function moneyText(value: unknown, cents: number): string {
  const result = string(value);
  const exact = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

  if (result !== exact) {
    throw new Error('周周返利金额展示不完整');
  }

  return result;
}

function parseCumulativeWeeklyRebate(data: Record<string, unknown>): CumulativeWeeklyRebateQueryData {
  if (data.rulesVersion !== WEEKLY_CUMULATIVE_RULES) {
    throw new Error('周周返利规则已更新，请刷新后再试');
  }
  const periodStart = string(data.periodStart);
  const periodEnd = string(data.periodEnd);

  if (!Number.isFinite(Date.parse(periodStart)) || !Number.isFinite(Date.parse(periodEnd)) || Date.parse(periodEnd) <= Date.parse(periodStart)) {
    throw new Error('周周返利缺少有效截止时间');
  }
  const weekRechargedAmount = amount(data.weekRechargedAmount);
  const seen = new Set<number>();
  const rewards = array(data.rewards).map(value => {
    const row = record(value);
    const thresholdYuan = amount(row.thresholdYuan);
    const thresholdAmount = amount(row.thresholdAmount);
    const remainingAmount = amount(row.remainingAmount);

    if (!WEEKLY_CUMULATIVE_THRESHOLDS.some(tier => tier === thresholdYuan) || thresholdAmount !== thresholdYuan * 100 || seen.has(thresholdAmount)) {
      throw new Error('周周返利档位不完整');
    }
    seen.add(thresholdAmount);

    return {
      thresholdAmount,
      thresholdYuan,
      label: string(row.label),
      configured: boolean(row.configured),
      claimed: boolean(row.claimed),
      canClaim: boolean(row.canClaim),
      remainingAmount,
      remainingText: moneyText(row.remainingText, remainingAmount),
      statusTag: string(row.statusTag),
      spiritStone: amount(row.spiritStone),
      spiritCrystal: amount(row.spiritCrystal),
      spiritMilk: amount(row.spiritMilk),
      rewardText: string(row.rewardText),
      items: array(row.items).map(value => {
        const item = record(value);

        if (item.name !== null && typeof item.name !== 'string') {
          throw new Error('周周返利物品名称不完整');
        }

        return { itemId: amount(item.itemId), quantity: amount(item.quantity), name: item.name };
      })
    };
  });

  if (rewards.length !== WEEKLY_CUMULATIVE_THRESHOLDS.length) {
    throw new Error('周周返利档位不完整');
  }
  const claimedAmounts = array(data.claimedAmounts).map(amount);

  if (claimedAmounts.some(cents => !WEEKLY_CUMULATIVE_THRESHOLDS.some(tier => tier * 100 === cents))) {
    throw new Error('周周返利已领取档位不完整');
  }
  const loop = record(data.loop);
  const totalCount = amount(loop.totalCount);
  const claimedCount = amount(loop.claimedCount);
  const claimableCount = amount(loop.claimableCount);
  const expectedLoopCount = amount(loop.expectedLoopCount);

  if (
    loop.baseAmount !== 64800 ||
    loop.stepAmount !== 1000 ||
    loop.quantity !== 1 ||
    expectedLoopCount !== totalCount ||
    claimableCount !== Math.max(0, totalCount - claimedCount)
  ) {
    throw new Error('周周返利循环进度不完整');
  }

  return {
    mode: WEEKLY_CUMULATIVE_MODE,
    rulesVersion: WEEKLY_CUMULATIVE_RULES,
    eligible: boolean(data.eligible),
    minAccountDays: amount(data.minAccountDays),
    daysSinceRegistration: number(data.daysSinceRegistration),
    weekStart: weeklyRebateWeekStart(data.weekStart),
    periodStart,
    periodEnd,
    deadlineText: string(data.deadlineText),
    weekRechargedAmount,
    weekRechargedYuan: number(data.weekRechargedYuan),
    weekRechargeText: moneyText(data.weekRechargeText, weekRechargedAmount),
    claimedAmounts,
    loop: {
      baseAmount: 64800,
      stepAmount: 1000,
      itemId: amount(loop.itemId),
      name: string(loop.name),
      quantity: 1,
      totalCount,
      claimedCount,
      claimableCount,
      expectedLoopCount,
      canClaim: boolean(loop.canClaim),
      configured: boolean(loop.configured),
      statusTag: string(loop.statusTag),
      rewardText: string(loop.rewardText)
    },
    rewards: rewards.sort((a, b) => a.thresholdAmount - b.thresholdAmount)
  };
}
