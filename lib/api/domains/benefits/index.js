import { benefitsOperationDefinitions } from "./operations.js";

//#region src/api/domains/benefits/index.ts
function createBenefitsApi(client) {
	return {
		get_players_id_activities_newcomer_login: (...args) => client.request("get_players_id_activities_newcomer_login", ...args),
		get_players_id_recharge_catalog: (...args) => client.request("get_players_id_recharge_catalog", ...args),
		get_players_id_recharge_normal_packages: (...args) => {
			return client.request("get_players_id_recharge_normal_packages", ...args);
		},
		get_players_id_limited_events_tokens: (...args) => client.request("get_players_id_limited_events_tokens", ...args),
		get_players_id_vip_privileges: (...args) => client.request("get_players_id_vip_privileges", ...args),
		get_players_id_limited_events_recharge_tiers: (...args) => {
			return client.request("get_players_id_limited_events_recharge_tiers", ...args);
		},
		post_players_id_limited_events_recharge_tiers_subActivityId_claim: (...args) => {
			return client.request("post_players_id_limited_events_recharge_tiers_subActivityId_claim", ...args);
		},
		get_players_id_limited_events_recharge_packages: (...args) => {
			return client.request("get_players_id_limited_events_recharge_packages", ...args);
		},
		get_players_id_recharge_overview: (...args) => {
			return client.request("get_players_id_recharge_overview", ...args);
		},
		get_players_id_recharge_first: (...args) => {
			return client.request("get_players_id_recharge_first", ...args);
		},
		post_players_id_recharge_first_tiers_tierAmount_claim: (...args) => {
			return client.request("post_players_id_recharge_first_tiers_tierAmount_claim", ...args);
		},
		get_players_id_recharge_weekly_rebate: (...args) => {
			return client.request("get_players_id_recharge_weekly_rebate", ...args);
		},
		post_players_id_recharge_weekly_rebate_dayIndex_claim: (...args) => {
			return client.request("post_players_id_recharge_weekly_rebate_dayIndex_claim", ...args);
		},
		post_players_id_recharge_weekly_rebate_loop_claim: (...args) => {
			return client.request("post_players_id_recharge_weekly_rebate_loop_claim", ...args);
		},
		post_players_id_recharge_newcomer_claim: (...args) => {
			return client.request("post_players_id_recharge_newcomer_claim", ...args);
		},
		get_players_id_recharge_newcomer: (...args) => {
			return client.request("get_players_id_recharge_newcomer", ...args);
		},
		get_players_id_recharge_vip: (...args) => {
			return client.request("get_players_id_recharge_vip", ...args);
		},
		get_players_id_recharge_double: (...args) => {
			return client.request("get_players_id_recharge_double", ...args);
		},
		get_players_id_recharge_month_card: (...args) => {
			return client.request("get_players_id_recharge_month_card", ...args);
		},
		get_players_id_recharge_month_card_daily_rewards: (...args) => {
			return client.request("get_players_id_recharge_month_card_daily_rewards", ...args);
		},
		post_players_id_recharge_month_card_daily_rewards_claim_all: (...args) => {
			return client.request("post_players_id_recharge_month_card_daily_rewards_claim_all", ...args);
		},
		get_players_id_recharge_world_milestones: (...args) => {
			return client.request("get_players_id_recharge_world_milestones", ...args);
		},
		post_players_id_recharge_world_milestones_order_claim: (...args) => {
			return client.request("post_players_id_recharge_world_milestones_order_claim", ...args);
		},
		post_players_id_recharge_world_milestones_claim_all: (...args) => {
			return client.request("post_players_id_recharge_world_milestones_claim_all", ...args);
		}
	};
}

//#endregion
export { benefitsOperationDefinitions, createBenefitsApi };