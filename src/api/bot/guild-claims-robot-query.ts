import { parseGuildMilestoneClaim, parseGuildMilestonesClaimAll } from './guild-milestone-claim';
import { parseGuildStipend } from './guild-worship-stipend';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门领取响应不完整');
  }

  return value as Record<string, unknown>;
}
function message(row: Record<string, unknown>): string {
  if (typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门领取响应不完整');
  }

  return row.message;
}
export function parseRobotGuildMilestoneClaim(value: unknown, milestoneId: number) {
  const row = record(value);

  if (row.outcome === 'usage') {
    return { message: '请指定奖励ID，例如：领取宗门日活奖励 1' };
  }
  if (row.outcome !== 'result') {
    throw new Error('宗门领取响应不完整');
  }
  parseGuildMilestoneClaim(row.receipt, milestoneId);

  return { message: message(row) };
}
export const parseRobotGuildMilestonesClaimAll = parseGuildMilestonesClaimAll;
export function parseRobotGuildStipend(value: unknown) {
  const row = record(value);

  parseGuildStipend(row.receipt);

  return { message: message(row) };
}
