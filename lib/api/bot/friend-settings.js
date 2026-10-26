import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/friend-settings.ts
function parseBackendFriendSettings(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("好友设置数据不完整");
	const row = data;
	if (typeof row.canUseFifthLayerFeature !== "boolean" || typeof row.isEnabled !== "boolean" || row.realmName !== null && typeof row.realmName !== "string") throw new Error("好友设置字段不完整");
	return {
		canUseFifthLayerFeature: row.canUseFifthLayerFeature,
		realmName: row.realmName,
		isEnabled: row.isEnabled
	};
}
async function getBackendFriendSettings(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendFriendSettings(await requestBackend(bid, "get_players_id_friend_request_preference", { path: { id: uid } }));
}
async function setBackendFriendSettings(bid, uid, enabled, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const out = parseBackendFriendSettings(await requestBackend(bid, "patch_players_id_friend_request_preference", {
		path: { id: uid },
		body: { friendRequestEnabled: enabled },
		...context
	}));
	if (out.canUseFifthLayerFeature && out.isEnabled !== enabled) throw new Error("好友设置状态不一致");
	return out;
}

//#endregion
export { getBackendFriendSettings, parseBackendFriendSettings, setBackendFriendSettings };