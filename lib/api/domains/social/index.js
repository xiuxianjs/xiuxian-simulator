import { socialOperationDefinitions } from "./operations.js";

//#region src/api/domains/social/index.ts
function createSocialApi(client) {
	return {
		post_players_id_flymail_mute_command: (...args) => client.request("post_players_id_flymail_mute_command", ...args),
		post_players_id_friends_workflow: (...args) => client.request("post_players_id_friends_workflow", ...args),
		post_players_id_friend_requests_requestId_reject: (...args) => {
			return client.request("post_players_id_friend_requests_requestId_reject", ...args);
		},
		get_players_id_friends_removal_target: (...args) => client.request("get_players_id_friends_removal_target", ...args),
		get_players_id_friend_request_preference: (...args) => client.request("get_players_id_friend_request_preference", ...args),
		patch_players_id_friend_request_preference: (...args) => client.request("patch_players_id_friend_request_preference", ...args),
		post_players_id_blocklist_removal: (...args) => client.request("post_players_id_blocklist_removal", ...args),
		get_players_id_friends_random: (...args) => client.request("get_players_id_friends_random", ...args),
		get_players_id_social_access: (...args) => client.request("get_players_id_social_access", ...args),
		get_players_id_friends: (...args) => {
			return client.request("get_players_id_friends", ...args);
		},
		get_players_id_friend_requests: (...args) => {
			return client.request("get_players_id_friend_requests", ...args);
		},
		post_players_id_friend_requests: (...args) => {
			return client.request("post_players_id_friend_requests", ...args);
		},
		post_players_id_friend_requests_requestId_accept: (...args) => {
			return client.request("post_players_id_friend_requests_requestId_accept", ...args);
		},
		delete_players_id_friends_friendId: (...args) => {
			return client.request("delete_players_id_friends_friendId", ...args);
		},
		get_players_id_blocklist: (...args) => {
			return client.request("get_players_id_blocklist", ...args);
		},
		post_players_id_blocklist: (...args) => {
			return client.request("post_players_id_blocklist", ...args);
		},
		delete_players_id_blocklist_blockedUserId: (...args) => {
			return client.request("delete_players_id_blocklist_blockedUserId", ...args);
		}
	};
}

//#endregion
export { createSocialApi, socialOperationDefinitions };