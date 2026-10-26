export function competitionChallengeArguments(text: string) {
  const match = text
    .trim()
    .replace(/^(!|！|\/|#|＃)?\s*/, '')
    .match(/^挑战宗门\s+(\d+)$/);
  const value = match ? Number(match[1]) : null;

  return { target: match ? { defenderGuildId: Number.isFinite(value) ? value : null } : null };
}
export function parseRobotCompetitionChallenge(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门大比挑战响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  const receipt = row.receipt as Record<string, unknown> | undefined;

  if (
    row.outcome !== 'result' ||
    typeof row.message !== 'string' ||
    !receipt ||
    Array.isArray(receipt) ||
    typeof receipt.message !== 'string' ||
    typeof receipt.won !== 'boolean' ||
    !Number.isInteger(receipt.remaining) ||
    Number(receipt.remaining) < 0 ||
    (receipt.logId !== undefined && typeof receipt.logId !== 'string')
  ) {
    throw new Error('宗门大比挑战响应不完整');
  }

  return { outcome: 'result' as const, message: row.message, battleLogId: typeof receipt.logId === 'string' ? receipt.logId : null };
}
