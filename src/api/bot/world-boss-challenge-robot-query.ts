import { parseWorldBossChallenge } from './world-boss-challenge';
import { worldBossChallengeView } from '@src/response/worldBoss/challenge/view';

export function worldBossChallengeArguments(text: string) {
  const match = text.trim().match(/^(!|！|\/|#|＃)?挑战凶兽(?:\s+(.+))?$/);
  const modeText = match?.[2]?.trim();
  const all = modeText === '全部' || modeText === '一键' || modeText === '打完' || modeText === '剩余';

  return { mode: modeText && !all ? 'usage' : all ? 'all' : 'single' };
}
export function parseRobotWorldBossChallenge(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('凶兽挑战响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result' || (row.mode !== 'single' && row.mode !== 'all')) {
    throw new Error('凶兽挑战响应不完整');
  }
  const all = row.mode === 'all';

  return { outcome: 'result' as const, data: worldBossChallengeView(parseWorldBossChallenge(row.data, all), all) };
}
