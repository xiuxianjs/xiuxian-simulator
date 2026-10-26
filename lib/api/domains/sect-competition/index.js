import { sectCompetitionOperationDefinitions } from "./operations.js";

//#region src/api/domains/sect-competition/index.ts
function createSectCompetitionApi(client) {
	return {
		get_players_id_guild_competition_team_candidates: (...args) => client.request("get_players_id_guild_competition_team_candidates", ...args),
		get_guild_competitions_current_month_bets_mine: (...args) => client.request("get_guild_competitions_current_month_bets_mine", ...args),
		get_players_id_guild_competition_battles: (...args) => client.request("get_players_id_guild_competition_battles", ...args),
		get_players_id_guild_competition_home: (...args) => client.request("get_players_id_guild_competition_home", ...args),
		get_players_id_guild_competition_battles_battle_id: (...args) => client.request("get_players_id_guild_competition_battles_battle_id", ...args),
		get_guild_competitions_current_promotion_teams: (...args) => client.request("get_guild_competitions_current_promotion_teams", ...args),
		get_guild_competitions_current: (...args) => {
			return client.request("get_guild_competitions_current", ...args);
		},
		get_guild_competitions_current_teams: (...args) => {
			return client.request("get_guild_competitions_current_teams", ...args);
		},
		get_guild_competitions_current_battles: (...args) => {
			return client.request("get_guild_competitions_current_battles", ...args);
		},
		get_guild_competitions_current_bets_mine: (...args) => {
			return client.request("get_guild_competitions_current_bets_mine", ...args);
		},
		get_guild_competitions_current_rewards_mine: (...args) => {
			return client.request("get_guild_competitions_current_rewards_mine", ...args);
		},
		post_guild_competitions_current_rewards_claim: (...args) => {
			return client.request("post_guild_competitions_current_rewards_claim", ...args);
		},
		post_players_id_guild_competition_apply: (...args) => client.request("post_players_id_guild_competition_apply", ...args),
		post_players_id_guild_competition_team_members: (...args) => client.request("post_players_id_guild_competition_team_members", ...args),
		delete_players_id_guild_competition_team_members_position: (...args) => client.request("delete_players_id_guild_competition_team_members_position", ...args),
		post_players_id_guild_competition_team_position: (...args) => client.request("post_players_id_guild_competition_team_position", ...args),
		delete_players_id_guild_competition_team: (...args) => client.request("delete_players_id_guild_competition_team", ...args),
		post_players_id_guild_competition_bets: (...args) => client.request("post_players_id_guild_competition_bets", ...args),
		get_players_id_guild_competition_knockout_candidates: (...args) => client.request("get_players_id_guild_competition_knockout_candidates", ...args),
		post_players_id_guild_competition_knockout_challenges: (...args) => client.request("post_players_id_guild_competition_knockout_challenges", ...args),
		post_players_id_guild_competition_bets_follow: (...args) => client.request("post_players_id_guild_competition_bets_follow", ...args)
	};
}

//#endregion
export { createSectCompetitionApi, sectCompetitionOperationDefinitions };