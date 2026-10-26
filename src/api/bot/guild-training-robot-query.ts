import {
  parseGuildBattleTrainingState,
  parseGuildBattleTrainingUpgrade,
  type GuildBattleTrainingBranch,
  type GuildBattleTrainingKey
} from './guild-battle-training';

export function parseRobotGuildTraining(value: unknown, branch?: GuildBattleTrainingBranch, key?: GuildBattleTrainingKey) {
  if (branch && key) {
    return { code: 'OK' as const, data: parseGuildBattleTrainingUpgrade(value, branch, key) };
  }

  return { code: 'GUIDE' as const, data: parseGuildBattleTrainingState(value) };
}
