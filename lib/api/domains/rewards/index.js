import { rewardsOperationDefinitions } from "./operations.js";

//#region src/api/domains/rewards/index.ts
function createRewardsApi(client) {
	return {
		get_bounties: (...args) => {
			return client.request("get_bounties", ...args);
		},
		get_bounties_publish_policy: (...args) => {
			return client.request("get_bounties_publish_policy", ...args);
		},
		get_players_id_bounties_pending_rewards: (...args) => {
			return client.request("get_players_id_bounties_pending_rewards", ...args);
		},
		post_players_id_bounties: (...args) => {
			return client.request("post_players_id_bounties", ...args);
		},
		post_bounties_bountyId_accept: (...args) => {
			return client.request("post_bounties_bountyId_accept", ...args);
		},
		post_bounties_bountyId_challenge: (...args) => {
			return client.request("post_bounties_bountyId_challenge", ...args);
		},
		post_bounties_bountyId_claim: (...args) => {
			return client.request("post_bounties_bountyId_claim", ...args);
		},
		post_players_id_check_ins_daily: (...args) => {
			return client.request("post_players_id_check_ins_daily", ...args);
		},
		post_players_id_check_ins_celestial: (...args) => {
			return client.request("post_players_id_check_ins_celestial", ...args);
		},
		post_players_id_check_ins_newcomer: (...args) => {
			return client.request("post_players_id_check_ins_newcomer", ...args);
		},
		get_players_id_check_ins_ritual_scope: (...args) => {
			return client.request("get_players_id_check_ins_ritual_scope", ...args);
		},
		get_players_id_emails: (...args) => {
			return client.request("get_players_id_emails", ...args);
		},
		delete_players_id_emails: (...args) => {
			return client.request("delete_players_id_emails", ...args);
		},
		post_players_id_emails_emailId_claim: (...args) => {
			return client.request("post_players_id_emails_emailId_claim", ...args);
		},
		get_players_id_emails_unread_count: (...args) => {
			return client.request("get_players_id_emails_unread_count", ...args);
		},
		post_players_id_emails_claim_all: (...args) => {
			return client.request("post_players_id_emails_claim_all", ...args);
		},
		get_achievements: (...args) => {
			return client.request("get_achievements", ...args);
		},
		get_players_id_achievements: (...args) => {
			return client.request("get_players_id_achievements", ...args);
		},
		get_players_id_achievements_overview: (...args) => {
			return client.request("get_players_id_achievements_overview", ...args);
		},
		get_players_id_achievements_category_projection: (...args) => {
			return client.request("get_players_id_achievements_category_projection", ...args);
		},
		get_players_id_achievements_categories_category: (...args) => {
			return client.request("get_players_id_achievements_categories_category", ...args);
		},
		post_players_id_achievements_claim: (...args) => {
			return client.request("post_players_id_achievements_claim", ...args);
		},
		get_players_id_themes: (...args) => {
			return client.request("get_players_id_themes", ...args);
		},
		get_players_id_themes_permission: (...args) => {
			return client.request("get_players_id_themes_permission", ...args);
		},
		post_players_id_themes_themeId_activate: (...args) => {
			return client.request("post_players_id_themes_themeId_activate", ...args);
		},
		post_players_id_themes_deactivate: (...args) => {
			return client.request("post_players_id_themes_deactivate", ...args);
		},
		post_players_id_themes_custom: (...args) => {
			return client.request("post_players_id_themes_custom", ...args);
		},
		get_players_id_emails_emailId: (...args) => {
			return client.request("get_players_id_emails_emailId", ...args);
		},
		delete_players_id_emails_emailId: (...args) => {
			return client.request("delete_players_id_emails_emailId", ...args);
		},
		post_players_id_emails_emailId_delete_attempt: (...args) => {
			return client.request("post_players_id_emails_emailId_delete_attempt", ...args);
		},
		post_players_id_gift_codes_redeem: (...args) => {
			return client.request("post_players_id_gift_codes_redeem", ...args);
		},
		post_players_id_external_gift_codes_redeem: (...args) => {
			return client.request("post_players_id_external_gift_codes_redeem", ...args);
		},
		get_players_id_referral: (...args) => {
			return client.request("get_players_id_referral", ...args);
		},
		post_players_id_referral_sync: (...args) => {
			return client.request("post_players_id_referral_sync", ...args);
		},
		post_players_id_referral_bind: (...args) => {
			return client.request("post_players_id_referral_bind", ...args);
		},
		post_players_id_referral_claim: (...args) => {
			return client.request("post_players_id_referral_claim", ...args);
		},
		get_players_id_activities_rewardType: (...args) => {
			return client.request("get_players_id_activities_rewardType", ...args);
		},
		post_players_id_activities_rewardType_claim: (...args) => {
			return client.request("post_players_id_activities_rewardType_claim", ...args);
		},
		post_players_id_activities_rewardType_claim_all: (...args) => {
			return client.request("post_players_id_activities_rewardType_claim_all", ...args);
		},
		get_players_id_limited_events: (...args) => {
			return client.request("get_players_id_limited_events", ...args);
		},
		get_players_id_limited_events_check_ins: (...args) => {
			return client.request("get_players_id_limited_events_check_ins", ...args);
		},
		post_players_id_limited_events_check_in: (...args) => {
			return client.request("post_players_id_limited_events_check_in", ...args);
		},
		get_players_id_limited_events_tasks: (...args) => {
			return client.request("get_players_id_limited_events_tasks", ...args);
		},
		post_players_id_limited_events_tasks_taskId_claim: (...args) => {
			return client.request("post_players_id_limited_events_tasks_taskId_claim", ...args);
		},
		post_players_id_themes_ink_mode: (...args) => {
			return client.request("post_players_id_themes_ink_mode", ...args);
		},
		delete_players_id_themes_custom_themeId: (...args) => {
			return client.request("delete_players_id_themes_custom_themeId", ...args);
		}
	};
}

//#endregion
export { createRewardsApi, rewardsOperationDefinitions };