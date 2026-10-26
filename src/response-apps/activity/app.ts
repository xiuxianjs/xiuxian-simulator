import { requestBackend } from '@src/api/bot/client';
import type { CodeResult } from '@src/types/result';
export type ActivityPageData = {
  limitedEvent: { activeCount: number };
  guildCompetition: { phase: 'NOT_STARTED' | 'REGISTRATION' | 'KNOCKOUT' | 'PROMOTION' | 'ENDED' };
  guildSecretRealmWar: {
    phase: 'ACTIVE' | 'LOCKED';
    activeStartAt: string;
    activeEndAt: string;
    maxAttackPerWeek: number;
    remainingAttackCount: number;
    guild?: { name: string; outputBonusPct: number; occupation?: { source: 'CURRENT' | 'SETTLED'; top: number; high: number; low: number; total: number } };
  };
  tower: { isOpen: boolean; openStartDay: number; openEndDay: number; challengeHpCost: number };
  tianjiao: { isVisible: boolean; canChallenge: boolean; stageName: string; requiredText: string };
  access: { hasGuild: boolean; canAccessOverseasIsland: boolean; canAccessTower: boolean };
};
export type ActivityPageResult = CodeResult<'OK', 'INVALID_USER' | 'LOAD_FAILED', ActivityPageData>;
function valid(x: unknown): x is ActivityPageData {
  const v = x as any;

  return (
    !!v &&
    typeof v.limitedEvent?.activeCount === 'number' &&
    typeof v.guildCompetition?.phase === 'string' &&
    typeof v.guildSecretRealmWar?.phase === 'string' &&
    typeof v.tower?.isOpen === 'boolean' &&
    typeof v.tianjiao?.isVisible === 'boolean' &&
    typeof v.access?.hasGuild === 'boolean'
  );
}
export default async function App(params: { bid?: string; uid?: number }): Promise<ActivityPageResult> {
  if (!params.uid || !params.bid) {
    return { code: 'INVALID_USER' };
  }
  try {
    const data = await requestBackend(params.bid, 'get_players_id_activity_hub', { path: { id: params.uid } });

    if (!valid(data)) {
      throw new Error('活动总览响应不完整');
    }

    return { code: 'OK', data };
  } catch {
    return { code: 'LOAD_FAILED' };
  }
}
