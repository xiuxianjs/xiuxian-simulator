import { parseCompetitionMemberCandidates } from './competition-member-candidates-query';
import { parseCompetitionActionResult } from './guild-competition-actions';
import { resolveRobotTargetFromArg, type RobotTarget } from '@src/utils/targetUid';

type Result =
  | { outcome: 'usage' | 'no_target' }
  | { outcome: 'list'; data: ReturnType<typeof parseCompetitionMemberCandidates> }
  | { outcome: 'result'; receipt: { message: string } }
  | { outcome: 'positions'; targetUid: number; availablePositions: number[] };
export function parseRobotCompetitionMemberAdd(value: unknown): Result {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门大比添加成员响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage' || row.outcome === 'no_target') {
    return { outcome: row.outcome };
  }
  if (row.outcome === 'list') {
    const data = parseCompetitionMemberCandidates(row.data);

    if (!data.hasGuild || !data.hasTeam || !data.canManage || !data.members.length) {
      throw new Error('宗门大比添加成员响应不完整');
    }

    return { outcome: 'list', data };
  }
  if (row.outcome === 'result') {
    return { outcome: 'result', receipt: parseCompetitionActionResult(row.receipt) };
  }
  if (
    row.outcome === 'positions' &&
    Number.isSafeInteger(row.targetUid) &&
    Number(row.targetUid) > 0 &&
    Array.isArray(row.availablePositions) &&
    row.availablePositions.length > 0 &&
    row.availablePositions.length <= 6 &&
    row.availablePositions.every(p => Number.isSafeInteger(p) && p >= 1 && p <= 6)
  ) {
    return { outcome: 'positions', targetUid: Number(row.targetUid), availablePositions: row.availablePositions };
  }
  throw new Error('宗门大比添加成员响应不完整');
}
export type CompetitionMemberAddArguments = {
  mode: 'usage' | 'list' | 'positions' | 'direct';
  pageText?: string;
  target?: RobotTarget | null;
  position?: number | null;
};
export async function competitionMemberAddArguments(
  text: string,
  mention?: Parameters<typeof resolveRobotTargetFromArg>[1]
): Promise<CompetitionMemberAddArguments> {
  const cleaned = text.trim().replace(/^(!|！|\/|#|＃)?\s*/, '');
  const pageMatch = cleaned.match(/^添加宗门大比成员\s+p(\d+)$/);
  const fullMatch = cleaned.match(/^添加宗门大比成员\s+(\S+)\s+(\d+)$/);
  const partialMatch = cleaned.match(/^添加宗门大比成员\s+(\S+)$/);

  if (fullMatch) {
    const position = Number(fullMatch[2]);

    return { mode: 'direct', target: await resolveRobotTargetFromArg(fullMatch[1], mention), position: Number.isFinite(position) ? position : null };
  }
  if (cleaned === '添加宗门大比成员' || pageMatch) {
    return { mode: 'list', pageText: String(Math.max(1, Number(pageMatch?.[1] ?? 1))) };
  }
  if (partialMatch) {
    return { mode: 'positions', target: await resolveRobotTargetFromArg(partialMatch[1], mention) };
  }

  return { mode: 'usage' };
}
