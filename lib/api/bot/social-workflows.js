import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseDeleteFriendResult } from "../schemas/friend-removal.js";

//#region src/api/bot/social-workflows.ts
function identity(bid) {
	if (!bid) throw new Error("操作缺少平台身份");
	return bid;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("社交业务响应不完整");
	return value;
}
async function requestFriendWorkflow(bid, uid, body, request, repeatCommand) {
	const context = body.action === "remove" && !body.confirmed || !body.targetUid && !body.targetBid ? request?.requestId ? { requestId: request.requestId } : {} : writeContext(request);
	return parseBackendFriendWorkflow(record(await requestBackend(identity(bid), "post_players_id_friends_workflow", {
		path: { id: uid },
		body,
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	})), body.action);
}
function parseBackendFriendWorkflow(value, action) {
	const data = record(value);
	if (typeof data.outcome !== "string" || ![
		"locked",
		"target_invalid",
		"target_missing",
		"confirmation_required",
		"result"
	].includes(data.outcome) || data.realmName !== null && typeof data.realmName !== "string" || typeof data.targetId !== "string") throw new Error("好友业务响应不完整");
	if (data.target !== null) {
		const target = record(data.target);
		if (!Number.isInteger(target.id) || Number(target.id) <= 0 || target.name !== null && typeof target.name !== "string") throw new Error("好友目标响应不完整");
	}
	if (data.outcome === "result" && action === "request") {
		const result = record(data.request);
		if (typeof result.success !== "boolean" || !Number.isInteger(result.requestId) || Number(result.requestId) < 0 || [
			"targetName",
			"fromUserName",
			"message"
		].some((key) => typeof result[key] !== "string")) throw new Error("好友申请结算响应不完整");
	}
	if (data.outcome === "result" && action === "remove") parseDeleteFriendResult(data.removal);
	return data;
}
async function requestTeamWorkflow(bid, uid, body, request, repeatCommand) {
	const context = body.action === "applications" ? request?.requestId ? { requestId: request.requestId } : {} : writeContext(request);
	return parseBackendTeamWorkflow(record(await requestBackend(identity(bid), "post_players_id_team_workflow", {
		path: { id: uid },
		body,
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	})), body.action);
}
function parseBackendTeamWorkflow(value, action) {
	const data = record(value);
	if (action !== "applications") {
		const outcomes = action === "position" ? [
			"updated",
			"invalid_position",
			"not_in_team",
			"not_leader",
			"target_not_in_team",
			"same_position",
			"target_missing"
		] : [
			"transferred",
			"self",
			"not_in_team",
			"not_leader",
			"target_not_in_team",
			"target_missing"
		];
		if (typeof data.outcome !== "string" || !outcomes.includes(data.outcome)) throw new Error("队伍操作响应不完整");
	} else {
		const records = record(data.records);
		if (typeof records.isLeader !== "boolean" || typeof records.canUseSecondLayerFeature !== "boolean" || typeof records.realmName !== "string" || !Array.isArray(records.applications) || records.applications.some((item) => !item || !Number.isFinite(item.id) || item.leaderName !== null && typeof item.leaderName !== "string" || item.createdAt !== null && (typeof item.createdAt !== "string" || !Number.isFinite(new Date(item.createdAt).getTime())))) throw new Error("队伍申请响应不完整");
		if (records.canUseSecondLayerFeature && records.isLeader) {
			const pending = record(data.pending);
			if (pending.leaderName !== null && typeof pending.leaderName !== "string" || !Array.isArray(pending.applications) || pending.applications.some((item) => !item || !Number.isFinite(item.id) || !Number.isFinite(item.userId) || item.userName !== null && typeof item.userName !== "string")) throw new Error("队伍申请响应不完整");
		}
	}
	return data;
}

//#endregion
export { parseBackendFriendWorkflow, parseBackendTeamWorkflow, requestFriendWorkflow, requestTeamWorkflow };