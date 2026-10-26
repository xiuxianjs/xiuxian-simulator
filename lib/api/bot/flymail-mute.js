import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/flymail-mute.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("飞信禁言接口响应不完整");
	return value;
}
function nullableText(value) {
	return value === null || typeof value === "string";
}
function outcome(value) {
	return value === "updated" || value === "self" || value === "not_found" || value === "locked";
}
function parseMuteState(value) {
	const data = record(value);
	if (!outcome(data.outcome) || !nullableText(data.targetName) || !nullableText(data.realmName) || data.outcome === "updated" && (typeof data.targetName !== "string" || data.targetName === "") || data.outcome !== "updated" && data.targetName !== null) throw new Error("飞信禁言状态响应不完整");
	return {
		outcome: data.outcome,
		targetName: data.targetName,
		realmName: data.realmName
	};
}
function parseMuteContext(value) {
	const data = record(value);
	if (typeof data.allowed !== "boolean" || !nullableText(data.realmName) || data.targetUid !== null && (typeof data.targetUid !== "number" || !Number.isSafeInteger(data.targetUid) || data.targetUid <= 0)) throw new Error("飞信禁言资格响应不完整");
	return {
		allowed: data.allowed,
		realmName: data.realmName,
		targetUid: data.targetUid
	};
}
async function getBackendFlyMailMuteContext(bid, uid, targetBid) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	return parseMuteContext(await requestBackend(bid, "get_players_id_flymail_mute_context", {
		path: { id: uid },
		...targetBid ? { query: { targetBid } } : {}
	}));
}
async function setBackendFlyMailMute(bid, uid, targetId, muted, request) {
	if (!bid?.trim()) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseMuteState(await requestBackend(bid, muted ? "post_players_id_flymail_mutes_targetId" : "delete_players_id_flymail_mutes_targetId", {
		path: {
			id: uid,
			targetId
		},
		...context
	}));
}
async function commandBackendFlyMailMute(bid, uid, targetUid, targetBid, muted, request) {
	if (!bid?.trim()) throw new Error("操作缺少平台身份");
	const data = record(await requestBackend(bid, "post_players_id_flymail_mute_command", {
		path: { id: uid },
		body: {
			targetUid,
			...targetBid ? { targetBid } : {},
			muted
		},
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}));
	return {
		access: parseMuteContext(data.access),
		result: data.result === null ? null : parseMuteState(data.result)
	};
}
function parseRobotFlyMailMute(value) {
	const out = parseMuteState(value);
	if (out.outcome !== "updated") throw new Error("飞信禁言状态响应不完整");
	return out;
}

//#endregion
export { commandBackendFlyMailMute, getBackendFlyMailMuteContext, parseMuteState, parseRobotFlyMailMute, setBackendFlyMailMute };