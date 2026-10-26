import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseNonNegativeIssuedRewards } from '../schemas/issued-reward';

export async function claimBackendCelestialCheckIn(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<{ ritualText: string; signedSlots: string[]; issued: Array<{ name: string; amount: number }> }> {
  if (!bid) {
    throw new Error('登仙台签到缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_check_ins_scope_with_ritual', {
    path: { id: uid, scope: 'celestial' },
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseCelestialCheckIn(data);
}
export function parseCelestialCheckIn(data: unknown): { ritualText: string; signedSlots: string[]; issued: Array<{ name: string; amount: number }> } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('登仙台签到响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (!Array.isArray(row.signedSlots) || !row.signedSlots.every(value => typeof value === 'string') || !Array.isArray(row.issued)) {
    throw new Error('登仙台签到响应不完整');
  }

  return {
    ritualText: typeof row.ritualText === 'string' ? row.ritualText : '',
    signedSlots: row.signedSlots,
    issued: parseNonNegativeIssuedRewards(row.issued, '登仙台签到响应不完整').map(({ name, amount }) => ({ name, amount }))
  };
}
