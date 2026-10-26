import { getEventAccessFacts } from "./access-facts.js";
import { requestBackend, writeContext } from "./client.js";
import { parseDeleteFriendResult } from "../schemas/friend-removal.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/friend-removal.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("好友接口响应不完整");
	return value;
}
async function getBackendFriendRemovalAccess(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;
	if (cached) return {
		ok: cached.canUseFifthLayerFeature,
		realmName: cached.realmNameValue ?? "未知"
	};
	const row = record(await requestBackend(bid, "get_players_id_social_access", { path: { id: uid } }));
	if (typeof row.canUseFifthLayerFeature !== "boolean" || row.realmNameValue !== null && typeof row.realmNameValue !== "string") throw new Error("好友资格响应不完整");
	return {
		ok: row.canUseFifthLayerFeature,
		realmName: row.realmNameValue ?? "未知"
	};
}
async function getBackendFriendRemovalTarget(bid, uid, query) {
	if (!bid) throw new Error("查询缺少平台身份");
	const row = record(await requestBackend(bid, "get_players_id_friends_removal_target", {
		path: { id: uid },
		query
	}));
	if (row.target !== null) {
		const target = record(row.target);
		if (typeof target.id !== "number" || !Number.isInteger(target.id) || target.id <= 0 || target.name !== null && typeof target.name !== "string") throw new Error("好友目标响应不完整");
	}
	return row.target;
}
async function deleteBackendFriend(bid, uid, friendId, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseDeleteFriendResult(await requestBackend(bid, "delete_players_id_friends_friendId", {
		path: {
			id: uid,
			friendId
		},
		...context
	}));
}

//#endregion
export { deleteBackendFriend, getBackendFriendRemovalAccess, getBackendFriendRemovalTarget };