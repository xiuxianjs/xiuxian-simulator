import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type {
  GuildBattleTrainingBranch,
  GuildBattleTrainingKey,
  GuildBattleTrainingState,
  GuildBattleTrainingUpgradeResult
} from '../schemas/guild-battle-training';

export type {
  GuildBattleTrainingBranch,
  GuildBattleTrainingKey,
  GuildBattleTrainingState,
  GuildBattleTrainingUpgradeResult
} from '../schemas/guild-battle-training';

const nullableInteger = (value: unknown) => value === null || Number.isSafeInteger(value);

function completeLine(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;

  return (
    [row.key, row.name, row.effectText].every(value => typeof value === 'string') &&
    [row.level, row.maxLevel].every(Number.isSafeInteger) &&
    [row.nextCostPrestige, row.nextCostSpiritStone, row.nextCostContribution].every(nullableInteger)
  );
}

export function parseGuildBattleTrainingState(value: unknown): GuildBattleTrainingState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门战备响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    ![row.guildId, row.guildLevel, row.prestige, row.spiritStone, row.contributionPoints, row.teamMaxLevel, row.personalMaxLevel].every(Number.isSafeInteger) ||
    typeof row.guildName !== 'string' ||
    typeof row.unlocked !== 'boolean' ||
    typeof row.canUpgradeTeam !== 'boolean' ||
    !Array.isArray(row.team) ||
    !Array.isArray(row.personal) ||
    !row.team.every(completeLine) ||
    !row.personal.every(completeLine)
  ) {
    throw new Error('宗门战备响应不完整');
  }

  return row as unknown as GuildBattleTrainingState;
}

export function parseGuildBattleTrainingUpgrade(
  value: unknown,
  branch: GuildBattleTrainingBranch,
  key: GuildBattleTrainingKey
): GuildBattleTrainingUpgradeResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门战备升级响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    row.branch !== branch ||
    row.key !== key ||
    typeof row.name !== 'string' ||
    !Number.isSafeInteger(row.newLevel) ||
    typeof row.effectText !== 'string' ||
    typeof row.costText !== 'string' ||
    ![row.contributionPoints, row.prestige, row.spiritStone].every(nullableInteger)
  ) {
    throw new Error('宗门战备升级响应不完整');
  }

  return row as unknown as GuildBattleTrainingUpgradeResult;
}

export async function getBackendGuildBattleTraining(bid: string | undefined, uid: number): Promise<GuildBattleTrainingState> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildBattleTrainingState(await requestBackend(bid, 'get_players_id_guild_battle_training', { path: { id: uid } }));
}

export async function postBackendGuildBattleTraining(
  bid: string | undefined,
  uid: number,
  branch: GuildBattleTrainingBranch,
  key: GuildBattleTrainingKey,
  request?: BackendRequestContext
): Promise<GuildBattleTrainingUpgradeResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  const response = await requestBackend(bid, 'post_players_id_guild_battle_training', {
    path: { id: uid },
    body: { branch, key },
    ...writeContext(request)
  });

  return parseGuildBattleTrainingUpgrade(response, branch, key);
}
