export interface TeamMatchSnapshot {
  targetLabel: string;
  waitedSeconds: number;
  timeoutSeconds: number;
  phase: 'WAITING' | 'SAME_REALM' | 'ADJACENT_REALM' | 'NEAREST_REALM';
}

export function parseTeamMatchSnapshot(value: unknown, message: string): TeamMatchSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  const data = value as Record<string, unknown>;

  if (
    typeof data.targetLabel !== 'string' ||
    !Number.isSafeInteger(data.waitedSeconds) ||
    Number(data.waitedSeconds) < 0 ||
    !Number.isSafeInteger(data.timeoutSeconds) ||
    Number(data.timeoutSeconds) < 0 ||
    typeof data.phase !== 'string' ||
    !['WAITING', 'SAME_REALM', 'ADJACENT_REALM', 'NEAREST_REALM'].includes(data.phase)
  ) {
    throw new Error(message);
  }

  return data as unknown as TeamMatchSnapshot;
}
