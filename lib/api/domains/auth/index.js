import { authOperationDefinitions } from "./operations.js";

//#region src/api/domains/auth/index.ts
function createAuthApi(client) {
	return {
		post_robot_middleware_entry: (...args) => {
			return client.request("post_robot_middleware_entry", ...args);
		},
		getRobotIdentity: (...args) => {
			return client.request("getRobotIdentity", ...args);
		},
		post_auth_email_verifications: (...args) => {
			return client.request("post_auth_email_verifications", ...args);
		},
		post_auth_email_verifications_type_confirm: (...args) => {
			return client.request("post_auth_email_verifications_type_confirm", ...args);
		},
		put_auth_password: (...args) => {
			return client.request("put_auth_password", ...args);
		},
		put_players_id_auth_password: (...args) => {
			return client.request("put_players_id_auth_password", ...args);
		},
		get_auth_profile: (...args) => {
			return client.request("get_auth_profile", ...args);
		},
		delete_auth_sessions_sessionId: (...args) => {
			return client.request("delete_auth_sessions_sessionId", ...args);
		},
		post_auth_sessions_revoke_others: (...args) => {
			return client.request("post_auth_sessions_revoke_others", ...args);
		},
		post_players_id_auth_temporary_password: (...args) => {
			return client.request("post_players_id_auth_temporary_password", ...args);
		},
		post_auth_login: (...args) => {
			return client.request("post_auth_login", ...args);
		},
		post_auth_refresh: (...args) => {
			return client.request("post_auth_refresh", ...args);
		},
		post_auth_logout: (...args) => {
			return client.request("post_auth_logout", ...args);
		},
		get_auth_sessions: (...args) => {
			return client.request("get_auth_sessions", ...args);
		}
	};
}

//#endregion
export { authOperationDefinitions, createAuthApi };