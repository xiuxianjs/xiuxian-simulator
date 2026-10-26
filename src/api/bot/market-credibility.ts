import type { MarketCredibilityInfo } from '../schemas/market-credibility';
export function parseMarketCredibility(data: unknown): MarketCredibilityInfo {
  const row = data as MarketCredibilityInfo;

  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    typeof row.isAboveThreshold !== 'boolean' ||
    typeof row.progressBar !== 'string' ||
    typeof row.statusText !== 'string'
  ) {
    throw new Error('信誉资料不完整');
  }
  for (const key of ['baseScore', 'vipBonus', 'monthCardBonus', 'activityScore', 'totalScore', 'threshold', 'dailyFreeCancelLimit', 'maxScore'] as const) {
    if (typeof row[key] !== 'number' || !Number.isSafeInteger(row[key])) {
      throw new Error('信誉资料数值不完整');
    }
  }

  return row;
}
