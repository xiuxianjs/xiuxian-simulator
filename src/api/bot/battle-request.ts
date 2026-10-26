import type { OperationId } from '../registry';

export const UNKNOWN_BATTLE_RESULT = '战斗结果暂未确认，请先查看角色状态和战斗记录，避免重复操作。';

// These commands settle gameplay, so their request budget must cover row-lock
// waits and settlement. Queries and other writes retain the configured budget.
const battleOperations = new Set<OperationId>([
  'post_players_id_dungeons_sweep',
  'post_players_id_dungeons_sweep_free',
  'post_players_id_dungeons_challenge',
  'post_players_id_dungeons_dungeonId_challenge',
  'post_players_id_storyline_sweep',
  'post_players_id_storyline_stages_stageId_challenge',
  'post_players_id_storyline_manual_battles',
  'post_players_id_storyline_manual_battles_sessionId_choices',
  'post_players_id_tower_challenge',
  'post_players_id_tower_sweep',
  'post_players_id_world_boss_challenge',
  'post_players_id_world_boss_challenge_all',
  'post_players_id_tongtian_tower_challenges',
  'post_players_id_tongtian_tower_sweeps',
  'post_players_id_tongtian_tower_batch_challenges',
  'post_players_id_tianjiao_challenges',
  'post_spar_playerId_targetId',
  'post_robbery_playerId_targetId',
  'post_counter_attacks_playerId_robberyLogId',
  'post_players_id_scarecrow_challenge',
  'post_players_id_guild_storyline_challenge',
  'post_players_id_secret_realms_realmNo_positions_positionNo_challenge',
  'post_players_id_guild_competition_knockout_challenges',
  'post_bounties_bountyId_accept',
  'post_players_id_spar_command',
  'post_players_id_storyline_challenge_command',
  'post_players_id_realm_promotion_command',
  'post_players_id_realm_promotion'
]);
const batchOperations = new Set<OperationId>([
  'post_players_id_world_boss_challenge_all',
  'post_players_id_tongtian_tower_batch_challenges',
  'post_players_id_dungeons_sweep_free'
]);

export function isBattleOperation(operation: OperationId): boolean {
  return battleOperations.has(operation);
}
export function backendRequestTimeout(operation: OperationId, configured: number): number {
  return Math.max(configured, batchOperations.has(operation) ? 120_000 : battleOperations.has(operation) ? 60_000 : configured);
}

const combinedBattleOperations: Record<string, OperationId> = {
  'realm.promotion': 'post_players_id_realm_promotion_command',
  'storyline.sweep': 'post_players_id_storyline_sweep',
  'storyline.choice': 'post_players_id_storyline_manual_battles_sessionId_choices',
  'storyline.challenge': 'post_players_id_storyline_challenge_command',
  'pvp.robbery': 'post_robbery_playerId_targetId',
  'pvp.counter-attack': 'post_counter_attacks_playerId_robberyLogId',
  'pvp.spar': 'post_players_id_spar_command',
  'scarecrow.challenge': 'post_players_id_scarecrow_challenge',
  'bounty.accept': 'post_bounties_bountyId_accept',
  'secret-realm.challenge': 'post_players_id_secret_realms_realmNo_positions_positionNo_challenge',
  'dungeon.sweep-free': 'post_players_id_dungeons_sweep_free',
  'demon-tower.sweep': 'post_players_id_tower_sweep',
  'ranking.challenge': 'post_players_id_tongtian_tower_challenges',
  'ranking.batch-challenge': 'post_players_id_tongtian_tower_batch_challenges',
  'ranking.sweep': 'post_players_id_tongtian_tower_sweeps',
  'tianjiao.challenge': 'post_players_id_tianjiao_challenges',
  'guild.storyline-challenge': 'post_players_id_guild_storyline_challenge',
  'competition.challenge': 'post_players_id_guild_competition_knockout_challenges'
};

/** Preserve original battle budgets and uncertain-result feedback behind the combined route. */
export function backendTransportOperation(operation: OperationId, parameters: unknown): OperationId {
  if (operation !== 'post_robot_business_operation' && operation !== 'post_v2_robot_business_operation') {
    return operation;
  }
  const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const request = record(parameters),
    path = record(request.path),
    body = record(request.body);

  if (path.operation === 'dungeon.challenge') {
    return record(body.arguments).mode === 'challenge' ? 'post_players_id_dungeons_challenge' : operation;
  }

  if (path.operation === 'dungeon.sweep') {
    return record(body.arguments).mode === 'sweep' ? 'post_players_id_dungeons_sweep' : operation;
  }

  if (path.operation === 'demon-tower.challenge') {
    const stars = record(body.arguments).stars;

    return typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3 ? 'post_players_id_tower_challenge' : operation;
  }

  if (path.operation === 'world-boss.challenge') {
    if (record(body.arguments).mode === 'usage') {
      return operation;
    }

    return record(body.arguments).mode === 'all' ? 'post_players_id_world_boss_challenge_all' : 'post_players_id_world_boss_challenge';
  }

  return typeof path.operation === 'string' && Object.hasOwn(combinedBattleOperations, path.operation) ? combinedBattleOperations[path.operation] : operation;
}
