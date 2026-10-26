import { parseCompetitionActionResult } from './guild-competition-actions';

type Result = { outcome: 'result'; receipt: { message: string }; message: string };
type Usage = { outcome: 'usage' };
export function parseRobotCompetitionTeamAction(value: unknown): Result;
export function parseRobotCompetitionTeamAction(value: unknown, allowUsage: true): Result | Usage;
export function parseRobotCompetitionTeamAction(value: unknown, allowUsage = false): Result | Usage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门大比操作响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (allowUsage && row.outcome === 'usage') {
    return { outcome: 'usage' };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('宗门大比操作响应不完整');
  }

  return { outcome: 'result', receipt: parseCompetitionActionResult(row.receipt), message: row.message };
}
const clean = (text: string) => text.trim().replace(/^(!|！|\/|#|＃)?\s*/, '');

export function competitionRemoveArguments(text: string) {
  const match = clean(text).match(/^移除宗门大比成员\s+(\d+)$/);

  return { positionText: match ? String(Number(match[1])) : null };
}
export function competitionAdjustArguments(text: string) {
  const match = clean(text).match(/^调整宗门大比位置\s+(\d+)\s+(\d+)$/);
  const number = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : null);

  return { positions: match ? { fromPosition: number(match[1]), toPosition: number(match[2]) } : null };
}
