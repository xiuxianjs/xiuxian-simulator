import type { KillGodRankingQueryData, ShaQiQueryData } from '../schemas/shaqi-query';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

function identity(bid?: string): string {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return bid;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('煞气查询接口数据不完整');
  }

  return value as Record<string, unknown>;
}
function numeric(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}
export function parseBackendShaQi(value: unknown): ShaQiQueryData | null {
  if (value === null) {
    return null;
  }
  const row = record(value);

  if (
    !numeric(row.shaQi) ||
    !numeric(row.killGodThreshold) ||
    !numeric(row.dailyDecayAmount) ||
    !numeric(row.jinpenReduceAmount) ||
    typeof row.onKillGodList !== 'boolean'
  ) {
    throw new Error('煞气查询接口数据不完整');
  }

  return row as unknown as ShaQiQueryData;
}
export async function getBackendShaQi(bid: string | undefined, uid: number): Promise<ShaQiQueryData | null> {
  return parseBackendShaQi(await requestBackend(identity(bid), 'get_players_id_sha_qi', { path: { id: uid } }));
}
export async function getBackendKillGodRanking(bid: string | undefined, uid: number): Promise<KillGodRankingQueryData> {
  return parseBackendKillGodRanking(await requestBackend(identity(bid), 'get_players_id_kill_god_ranking', { path: { id: uid } }));
}

export function parseBackendKillGodRanking(value: unknown): KillGodRankingQueryData {
  const data = record(value);

  parseBackendShaQi(data.shaQiInfo);
  if (
    !Array.isArray(data.list) ||
    !['robberyRemaining', 'robberyDailyMax', 'streak', 'streakBonusPercent', 'killGodThreshold'].every(key => numeric(data[key])) ||
    typeof data.streakText !== 'string' ||
    typeof data.rankingRuleText !== 'string' ||
    typeof data.hasKillGodTitle !== 'boolean' ||
    typeof data.canClaimTitle !== 'boolean'
  ) {
    throw new Error('煞气查询接口数据不完整');
  }
  for (const value of data.list) {
    const row = record(value);

    if (!['rank', 'uid', 'shaQi'].every(key => numeric(row[key])) || typeof row.name !== 'string') {
      throw new Error('煞气查询接口数据不完整');
    }
  }

  return data as unknown as KillGodRankingQueryData;
}

export type KillGodTitleClaimResult = 'OK' | 'TITLE_NOT_FOUND' | 'NOT_RANK1' | 'LIST_TOO_SHORT' | 'ALREADY_CLAIMED';

export async function claimBackendKillGodTitle(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<KillGodTitleClaimResult> {
  return parseBackendKillGodTitleClaim(
    await requestBackend(identity(bid), 'post_players_id_kill_god_title_claim', {
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export function parseBackendKillGodTitleClaim(value: unknown): KillGodTitleClaimResult {
  const data = record(value);
  const code = data.code;

  if (typeof code !== 'string' || !['OK', 'TITLE_NOT_FOUND', 'NOT_RANK1', 'LIST_TOO_SHORT', 'ALREADY_CLAIMED'].includes(code)) {
    throw new Error('领取杀神称号响应不完整');
  }

  return code as KillGodTitleClaimResult;
}

export function parseRobotShaQi(value: unknown): ShaQiQueryData {
  const info = parseBackendShaQi(value);

  if (!info) {
    throw new Error('无法获取煞气信息');
  }

  return info;
}

export function parseRobotKillGodTitleClaim(value: unknown): 'OK' {
  const code = parseBackendKillGodTitleClaim(value);

  if (code !== 'OK') {
    throw new Error('领取杀神称号响应不完整');
  }

  return code;
}
