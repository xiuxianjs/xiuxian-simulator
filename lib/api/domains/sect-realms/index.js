import { sectRealmsOperationDefinitions } from "./operations.js";

//#region src/api/domains/sect-realms/index.ts
function createSectRealmsApi(client) {
	return {
		get_guilds_guildId_members: (...args) => {
			return client.request("get_guilds_guildId_members", ...args);
		},
		post_players_id_guilds: (...args) => {
			return client.request("post_players_id_guilds", ...args);
		},
		delete_players_id_guilds_guildId: (...args) => {
			return client.request("delete_players_id_guilds_guildId", ...args);
		},
		post_players_id_guild_leadership_transfer: (...args) => {
			return client.request("post_players_id_guild_leadership_transfer", ...args);
		},
		post_players_id_guild_leadership_impeach: (...args) => {
			return client.request("post_players_id_guild_leadership_impeach", ...args);
		},
		get_guilds_guildId_permissions: (...args) => {
			return client.request("get_guilds_guildId_permissions", ...args);
		},
		post_players_id_guild_checkin: (...args) => {
			return client.request("post_players_id_guild_checkin", ...args);
		},
		get_guilds_guildId_essences: (...args) => {
			return client.request("get_guilds_guildId_essences", ...args);
		},
		post_players_id_guild_essences: (...args) => {
			return client.request("post_players_id_guild_essences", ...args);
		},
		delete_players_id_guild_essences_essenceId: (...args) => {
			return client.request("delete_players_id_guild_essences_essenceId", ...args);
		},
		post_players_id_guild_mining: (...args) => {
			return client.request("post_players_id_guild_mining", ...args);
		},
		get_players_id_guild_worship: (...args) => {
			return client.request("get_players_id_guild_worship", ...args);
		},
		post_players_id_guild_worship: (...args) => {
			return client.request("post_players_id_guild_worship", ...args);
		},
		post_players_id_guild_stipend_claim: (...args) => {
			return client.request("post_players_id_guild_stipend_claim", ...args);
		},
		get_players_id_guild_shop: (...args) => {
			return client.request("get_players_id_guild_shop", ...args);
		},
		post_players_id_guild_shop_exchange: (...args) => {
			return client.request("post_players_id_guild_shop_exchange", ...args);
		},
		get_players_id_guild_applications: (...args) => {
			return client.request("get_players_id_guild_applications", ...args);
		},
		post_players_id_guild_applications: (...args) => {
			return client.request("post_players_id_guild_applications", ...args);
		},
		post_players_id_guild_leave: (...args) => {
			return client.request("post_players_id_guild_leave", ...args);
		},
		get_guilds_guildId_applications: (...args) => {
			return client.request("get_guilds_guildId_applications", ...args);
		},
		post_guilds_guildId_applications_applicationId_approve: (...args) => {
			return client.request("post_guilds_guildId_applications_applicationId_approve", ...args);
		},
		post_guilds_guildId_applications_applicationId_reject: (...args) => {
			return client.request("post_guilds_guildId_applications_applicationId_reject", ...args);
		},
		delete_players_id_guild_applications_applicationId: (...args) => {
			return client.request("delete_players_id_guild_applications_applicationId", ...args);
		},
		post_players_id_guild_role: (...args) => {
			return client.request("post_players_id_guild_role", ...args);
		},
		post_players_id_guild_kick_targetId: (...args) => {
			return client.request("post_players_id_guild_kick_targetId", ...args);
		},
		post_players_id_guild_shop_refresh: (...args) => {
			return client.request("post_players_id_guild_shop_refresh", ...args);
		},
		post_players_id_guild_upgrade: (...args) => {
			return client.request("post_players_id_guild_upgrade", ...args);
		},
		get_players_id_secret_realms_home: (...args) => {
			return client.request("get_players_id_secret_realms_home", ...args);
		},
		get_secret_realms: (...args) => {
			return client.request("get_secret_realms", ...args);
		},
		get_secret_realms_realmNo: (...args) => {
			return client.request("get_secret_realms_realmNo", ...args);
		},
		get_guilds_guildId_secret_realms_scoreboard: (...args) => {
			return client.request("get_guilds_guildId_secret_realms_scoreboard", ...args);
		},
		post_players_id_secret_realms_realmNo_positions_positionNo_challenge: (...args) => {
			return client.request("post_players_id_secret_realms_realmNo_positions_positionNo_challenge", ...args);
		},
		post_players_id_secret_realms_claim: (...args) => {
			return client.request("post_players_id_secret_realms_claim", ...args);
		}
	};
}

//#endregion
export { createSectRealmsApi, sectRealmsOperationDefinitions };