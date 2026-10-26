import { parseDungeonCommand } from '@src/response/dungeon/enter/command';
import { parseDungeonChallenge } from './dungeon-challenge';

export function dungeonChallengeArguments(text: string) {
  const parsed = parseDungeonCommand(text);

  if (parsed.ok) {
    return { mode: 'challenge', dungeonName: parsed.dungeonName };
  }

  return { mode: parsed.isCommand ? 'usage' : 'no_match' };
}
export function parseRobotDungeonChallenge(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('秘境挑战响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'no_match') {
    return { outcome: 'no_match' as const };
  }
  if (row.outcome !== 'result') {
    throw new Error('秘境挑战响应不完整');
  }

  return { outcome: 'result' as const, data: parseDungeonChallenge(row.data) };
}
