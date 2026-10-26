// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { SectCompetitionOperations } from './types.js';
export { sectCompetitionOperationDefinitions } from './operations.js';

export function createSectCompetitionApi(client: APIClient) {
  return {
    get_players_id_guild_competition_team_candidates: (...args: RequestArguments<'get_players_id_guild_competition_team_candidates'>) => client.request('get_players_id_guild_competition_team_candidates', ...args),
    get_guild_competitions_current_month_bets_mine: (...args: RequestArguments<'get_guild_competitions_current_month_bets_mine'>) => client.request('get_guild_competitions_current_month_bets_mine', ...args),
    get_players_id_guild_competition_battles: (...args: RequestArguments<'get_players_id_guild_competition_battles'>) => client.request('get_players_id_guild_competition_battles', ...args),
    get_players_id_guild_competition_home: (...args: RequestArguments<'get_players_id_guild_competition_home'>) => client.request('get_players_id_guild_competition_home', ...args),
    get_players_id_guild_competition_battles_battle_id: (...args: RequestArguments<'get_players_id_guild_competition_battles_battle_id'>) => client.request('get_players_id_guild_competition_battles_battle_id', ...args),
    get_guild_competitions_current_promotion_teams: (...args: RequestArguments<'get_guild_competitions_current_promotion_teams'>) => client.request('get_guild_competitions_current_promotion_teams', ...args),
    get_guild_competitions_current: (...args: RequestArguments<'get_guild_competitions_current'>) => {
      return client.request('get_guild_competitions_current', ...args);
    },
    get_guild_competitions_current_teams: (...args: RequestArguments<'get_guild_competitions_current_teams'>) => {
      return client.request('get_guild_competitions_current_teams', ...args);
    },
    get_guild_competitions_current_battles: (...args: RequestArguments<'get_guild_competitions_current_battles'>) => {
      return client.request('get_guild_competitions_current_battles', ...args);
    },
    get_guild_competitions_current_bets_mine: (...args: RequestArguments<'get_guild_competitions_current_bets_mine'>) => {
      return client.request('get_guild_competitions_current_bets_mine', ...args);
    },
    get_guild_competitions_current_rewards_mine: (...args: RequestArguments<'get_guild_competitions_current_rewards_mine'>) => {
      return client.request('get_guild_competitions_current_rewards_mine', ...args);
    },
    post_guild_competitions_current_rewards_claim: (...args: RequestArguments<'post_guild_competitions_current_rewards_claim'>) => {
      return client.request('post_guild_competitions_current_rewards_claim', ...args);
    },

    post_players_id_guild_competition_apply: (...args: RequestArguments<'post_players_id_guild_competition_apply'>) => client.request('post_players_id_guild_competition_apply', ...args),
    post_players_id_guild_competition_team_members: (...args: RequestArguments<'post_players_id_guild_competition_team_members'>) => client.request('post_players_id_guild_competition_team_members', ...args),
    delete_players_id_guild_competition_team_members_position: (...args: RequestArguments<'delete_players_id_guild_competition_team_members_position'>) => client.request('delete_players_id_guild_competition_team_members_position', ...args),
    post_players_id_guild_competition_team_position: (...args: RequestArguments<'post_players_id_guild_competition_team_position'>) => client.request('post_players_id_guild_competition_team_position', ...args),
    delete_players_id_guild_competition_team: (...args: RequestArguments<'delete_players_id_guild_competition_team'>) => client.request('delete_players_id_guild_competition_team', ...args),
    post_players_id_guild_competition_bets: (...args: RequestArguments<'post_players_id_guild_competition_bets'>) => client.request('post_players_id_guild_competition_bets', ...args),
    get_players_id_guild_competition_knockout_candidates: (...args: RequestArguments<'get_players_id_guild_competition_knockout_candidates'>) => client.request('get_players_id_guild_competition_knockout_candidates', ...args),
    post_players_id_guild_competition_knockout_challenges: (...args: RequestArguments<'post_players_id_guild_competition_knockout_challenges'>) => client.request('post_players_id_guild_competition_knockout_challenges', ...args),
    post_players_id_guild_competition_bets_follow: (...args: RequestArguments<'post_players_id_guild_competition_bets_follow'>) => client.request('post_players_id_guild_competition_bets_follow', ...args)
  };
}
