import { playersOperationDefinitions } from "./operations.js";

//#region src/api/domains/players/index.ts
function createPlayersApi(client) {
	return {
		post_players_id_query_presentations: (...args) => client.request("post_players_id_query_presentations", ...args),
		post_players_id_companion_gifts_command: (...args) => client.request("post_players_id_companion_gifts_command", ...args),
		post_players_id_companion_proposals_command: (...args) => client.request("post_players_id_companion_proposals_command", ...args),
		post_players_id_tianshi_baolu_panel_query: (...args) => client.request("post_players_id_tianshi_baolu_panel_query", ...args),
		post_players_id_companion_shop_purchases_overview: (...args) => client.request("post_players_id_companion_shop_purchases_overview", ...args),
		post_players_id_shop_purchases_overview: (...args) => client.request("post_players_id_shop_purchases_overview", ...args),
		post_players_id_gacha_named_poolName_pull: (...args) => client.request("post_players_id_gacha_named_poolName_pull", ...args),
		get_players_id_gacha_named_poolName_view: (...args) => client.request("get_players_id_gacha_named_poolName_view", ...args),
		post_players_id_market_shop_overview_ensure: (...args) => client.request("post_players_id_market_shop_overview_ensure", ...args),
		post_players_id_companion_proposals_overview: (...args) => client.request("post_players_id_companion_proposals_overview", ...args),
		post_players_id_companion_confirmation_action: (...args) => client.request("post_players_id_companion_confirmation_action", ...args),
		post_players_id_companion_proposals_by_name_action: (...args) => client.request("post_players_id_companion_proposals_by_name_action", ...args),
		post_players_id_recharge_first_tiers_tierAmount_claim_overview: (...args) => client.request("post_players_id_recharge_first_tiers_tierAmount_claim_overview", ...args),
		post_players_id_recharge_month_card_daily_rewards_claim_overview: (...args) => client.request("post_players_id_recharge_month_card_daily_rewards_claim_overview", ...args),
		post_players_id_check_ins_scope_with_ritual: (...args) => client.request("post_players_id_check_ins_scope_with_ritual", ...args),
		post_players_id_referral_overview_sync: (...args) => client.request("post_players_id_referral_overview_sync", ...args),
		get_players_id_settings_overview: (...args) => client.request("get_players_id_settings_overview", ...args),
		post_players_id_home_overview: (...args) => client.request("post_players_id_home_overview", ...args),
		get_players_id_activity_hub: (...args) => {
			return client.request("get_players_id_activity_hub", ...args);
		},
		post_players_id_captcha_state_challenge: (...args) => {
			return client.request("post_players_id_captcha_state_challenge", ...args);
		},
		put_players_id_signature: (...args) => client.request("put_players_id_signature", ...args),
		patch_players_id_preferences_dao_crystal_confirmation: (...args) => {
			return client.request("patch_players_id_preferences_dao_crystal_confirmation", ...args);
		},
		patch_players_id_preferences_spirit_crystal_confirmation: (...args) => {
			return client.request("patch_players_id_preferences_spirit_crystal_confirmation", ...args);
		},
		get_players_id_preferences: (...args) => {
			return client.request("get_players_id_preferences", ...args);
		},
		post_players_id_client_state_repeat_record: (...args) => {
			return client.request("post_players_id_client_state_repeat_record", ...args);
		},
		patch_players_id_preferences_team_auto_accept_invite: (...args) => {
			return client.request("patch_players_id_preferences_team_auto_accept_invite", ...args);
		},
		patch_players_id_preferences_dungeon_battle_mode: (...args) => {
			return client.request("patch_players_id_preferences_dungeon_battle_mode", ...args);
		},
		patch_players_id_preferences_team_dungeon_energy: (...args) => {
			return client.request("patch_players_id_preferences_team_dungeon_energy", ...args);
		},
		patch_players_id_preferences_team_invites: (...args) => {
			return client.request("patch_players_id_preferences_team_invites", ...args);
		},
		patch_players_id_preferences_friend_team_approval: (...args) => {
			return client.request("patch_players_id_preferences_friend_team_approval", ...args);
		},
		patch_players_id_preferences_profile_visibility: (...args) => {
			return client.request("patch_players_id_preferences_profile_visibility", ...args);
		},
		get_robot_realm_access: (...args) => client.request("get_robot_realm_access", ...args),
		get_players_id_home_overview: (...args) => client.request("get_players_id_home_overview", ...args),
		get_players_id_home_notifications: (...args) => {
			return client.request("get_players_id_home_notifications", ...args);
		},
		post_players_id_home_atmosphere_claim: (...args) => {
			return client.request("post_players_id_home_atmosphere_claim", ...args);
		},
		get_players_id_feature_access: (...args) => client.request("get_players_id_feature_access", ...args),
		get_players_id_check_ins_status: (...args) => client.request("get_players_id_check_ins_status", ...args),
		get_me: (...args) => {
			return client.request("get_me", ...args);
		},
		post_players: (...args) => {
			return client.request("post_players", ...args);
		},
		get_players_id: (...args) => {
			return client.request("get_players_id", ...args);
		},
		get_players_by_bid_bid: (...args) => {
			return client.request("get_players_by_bid_bid", ...args);
		},
		get_players_id_battle_attributes: (...args) => {
			return client.request("get_players_id_battle_attributes", ...args);
		},
		get_players_id_attribute_panel: (...args) => {
			return client.request("get_players_id_attribute_panel", ...args);
		}
	};
}

//#endregion
export { createPlayersApi, playersOperationDefinitions };