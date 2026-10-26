import { parseDungeonSweep, parseDungeonFreeSweep } from './dungeon-sweep';
import { parseSweepCommand, dungeonSweepView } from '@src/response/dungeon/sweep/view';

export function dungeonSweepArguments(text: string) {
  const parsed = parseSweepCommand(text);

  if (parsed.ok) {
    return { mode: 'sweep', dungeonName: parsed.dungeonName, times: parsed.times };
  }
  if (!parsed.isCommand) {
    return { mode: 'no_match' };
  }
  if (parsed.message === '扫荡次数仅支持 1、5、10') {
    return { mode: 'invalid-times' };
  }
  if (parsed.message === '请输入秘境名称') {
    return { mode: 'empty-name' };
  }

  return { mode: 'usage' };
}
export function parseRobotDungeonSweep(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('秘境扫荡响应不完整');
  }
  const result = value as Record<string, unknown>;

  if (result.outcome === 'no_match') {
    return { outcome: 'no_match' as const };
  }
  if (result.outcome !== 'result') {
    throw new Error('秘境扫荡响应不完整');
  }

  return { outcome: 'result' as const, data: dungeonSweepView(parseDungeonSweep(result.data)) };
}
export function parseRobotDungeonFreeSweep(value: unknown) {
  const data = parseDungeonFreeSweep(value);

  return { ...data, sweptDungeons: data.sweptDungeons.map(dungeonSweepView) };
}
