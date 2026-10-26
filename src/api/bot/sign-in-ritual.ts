import { requestBackend } from './client';

export type SignInRitualScope = 'daily' | 'newcomer' | 'celestial';

export async function getBackendSignInRitualText(bid: string, uid: number, scope: SignInRitualScope): Promise<string> {
  const data = await requestBackend(bid, 'get_players_id_check_ins_ritual_scope', { path: { id: uid, scope } });

  if (!data || typeof data.ritualText !== 'string' || !data.ritualText.trim()) {
    throw new Error('签到寄语接口返回不完整');
  }

  return data.ritualText;
}
