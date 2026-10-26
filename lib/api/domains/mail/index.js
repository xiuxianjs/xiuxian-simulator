import { mailOperationDefinitions } from "./operations.js";

//#region src/api/domains/mail/index.ts
function createMailApi(client) {
	return {
		get_players_id_flymail_mute_context: (...args) => {
			return client.request("get_players_id_flymail_mute_context", ...args);
		},
		get_players_id_flymail: (...args) => {
			return client.request("get_players_id_flymail", ...args);
		},
		post_players_id_flymail: (...args) => {
			return client.request("post_players_id_flymail", ...args);
		},
		get_players_id_flymail_mutes: (...args) => {
			return client.request("get_players_id_flymail_mutes", ...args);
		},
		post_players_id_flymail_mutes_targetId: (...args) => {
			return client.request("post_players_id_flymail_mutes_targetId", ...args);
		},
		delete_players_id_flymail_mutes_targetId: (...args) => {
			return client.request("delete_players_id_flymail_mutes_targetId", ...args);
		}
	};
}

//#endregion
export { createMailApi, mailOperationDefinitions };