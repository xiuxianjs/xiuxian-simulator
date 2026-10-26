import { displayCurrencyText } from '@src/constants/currency';

export type NativeComebackOverview = {
  enabled: boolean;
  rules: { smallSilentDays: number; largeSilentDays: number; expireDays: number };
  current: null | {
    comebackType: 'small' | 'large';
    comebackTypeText: string;
    silentDays: number;
    remainingMs: number;
    remainingText: string;
    expBonusPercent: number;
    signIn: {
      currentDayIndex: number;
      canClaimToday: boolean;
      days: Array<{
        dayIndex: number;
        status: 'claimed' | 'claimable' | 'locked' | 'expired';
        statusText: string;
        rewardsPreview: string;
        rewardsPreviewText: string;
      }>;
    };
  };
};

function isOverview(value: unknown): value is NativeComebackOverview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const overview = value as Record<string, unknown>;

  if (typeof overview.enabled !== 'boolean' || !overview.rules || typeof overview.rules !== 'object') {
    return false;
  }
  const rules = overview.rules as Record<string, unknown>;

  if (typeof rules.smallSilentDays !== 'number' || typeof rules.largeSilentDays !== 'number' || typeof rules.expireDays !== 'number') {
    return false;
  }
  if (overview.current === null) {
    return true;
  }
  if (!overview.current || typeof overview.current !== 'object') {
    return false;
  }
  const current = overview.current as Record<string, unknown>;

  if (
    typeof current.comebackTypeText !== 'string' ||
    typeof current.remainingText !== 'string' ||
    typeof current.silentDays !== 'number' ||
    typeof current.expBonusPercent !== 'number'
  ) {
    return false;
  }
  if (!current.signIn || typeof current.signIn !== 'object') {
    return false;
  }
  const signIn = current.signIn as Record<string, unknown>;

  return (
    typeof signIn.currentDayIndex === 'number' &&
    typeof signIn.canClaimToday === 'boolean' &&
    Array.isArray(signIn.days) &&
    signIn.days.every(
      day => day && typeof day === 'object' && typeof day.dayIndex === 'number' && typeof day.statusText === 'string' && typeof day.rewardsPreviewText === 'string'
    )
  );
}
export function parseNativeComebackOverview(value: unknown): NativeComebackOverview {
  if (!isOverview(value)) {
    throw new Error('本服回归响应不完整');
  }
  const data = value;

  return {
    ...data,
    current: data.current
      ? {
          ...data.current,
          signIn: {
            ...data.current.signIn,
            days: data.current.signIn.days.map(day => ({ ...day, rewardsPreviewText: displayCurrencyText(day.rewardsPreviewText) }))
          }
        }
      : null
  };
}

export function parseNativeComebackClaim(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as { message?: unknown }).message !== 'string') {
    throw new Error('回归签到响应不完整');
  }
  const payload = value as { message: string; rewardSummary?: unknown };

  return {
    message: payload.message,
    rewardSummary: Array.isArray(payload.rewardSummary) ? payload.rewardSummary.filter((item): item is string => typeof item === 'string') : []
  };
}
