import { requestBackend } from './client';
import type { SponsorStatusData } from '../schemas/sponsor-status';

export async function getBackendSponsorStatus(bid: string | undefined, uid: number): Promise<SponsorStatusData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendSponsorStatus(await requestBackend(bid, 'get_players_id_payments_sponsor_status', { path: { id: uid } }));
}

export function parseBackendSponsorStatus(value: unknown): SponsorStatusData {
  const data = value as SponsorStatusData;

  if (!data || typeof data.hasThemePermission !== 'boolean') {
    throw new Error('赞助状态响应不完整');
  }
  for (const key of ['totalFen', 'totalYuan', 'thresholdFen', 'thresholdYuan', 'remainingFen', 'remainingYuan'] as const) {
    if (typeof data[key] !== 'number' || !Number.isFinite(data[key])) {
      throw new Error('赞助状态数值不完整');
    }
  }

  return data;
}
