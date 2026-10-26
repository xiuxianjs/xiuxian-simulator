import { parsePositiveIssuedRewards } from '../schemas/issued-reward';

export function parseRobotFirstRechargeClaim(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('首充领取响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.tierYuan !== 'number' || !Number.isFinite(row.tierYuan) || row.tierYuan <= 0) {
    throw new Error('首充领取响应不完整');
  }

  return { tierYuan: row.tierYuan, issued: parsePositiveIssuedRewards(row.issued === null ? [] : row.issued, '首充领取响应不完整') };
}
