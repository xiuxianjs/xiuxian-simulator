import { getEventAccessFacts } from "./access-facts.js";
import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/blocklist-removal.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("黑名单接口响应不完整");
	return value;
}
async function getBackendUnblockAccess(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;
	if (cached) return {
		ok: cached.canUseFifthLayerFeature,
		realmName: cached.realmNameValue ?? "未知"
	};
	const row = record(await requestBackend(bid, "get_players_id_social_access", { path: { id: uid } }));
	if (typeof row.canUseFifthLayerFeature !== "boolean" || row.realmNameValue !== null && typeof row.realmNameValue !== "string") throw new Error("黑名单资格响应不完整");
	return {
		ok: row.canUseFifthLayerFeature,
		realmName: row.realmNameValue ?? "未知"
	};
}
async function removeBackendBlocklist(bid, uid, body, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendUnblock(record(await requestBackend(bid, "post_players_id_blocklist_removal", {
		path: { id: uid },
		body,
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	})));
}
function parseBackendUnblock(value) {
	const row = record(value);
	if (typeof row.outcome !== "string" || ![
		"removed",
		"not_found",
		"not_blocked",
		"locked",
		"failed"
	].includes(row.outcome) || row.name !== null && typeof row.name !== "string" || row.realmName !== null && typeof row.realmName !== "string" || row.blockedUserId !== null && (typeof row.blockedUserId !== "number" || !Number.isInteger(row.blockedUserId) || row.blockedUserId <= 0) || row.outcome === "removed" && row.blockedUserId === null || row.outcome !== "removed" && (row.blockedUserId !== null || row.name !== null)) throw new Error("取消拉黑响应不完整");
	return row;
}

//#endregion
export { getBackendUnblockAccess, parseBackendUnblock, removeBackendBlocklist };