import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { BackendAPIError, requestBackend, writeContext } from "./client.js";

//#region src/api/bot/friend-request-actions.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("好友申请结算响应不完整");
	return value;
}
function parseBackendFriendMutation(value) {
	const row = record(value);
	if (typeof row.success !== "boolean" || typeof row.requestId !== "number" || !Number.isSafeInteger(row.requestId) || row.requestId < 0 || typeof row.targetName !== "string" || typeof row.fromUserName !== "string" || typeof row.message !== "string") throw new Error("好友申请结算响应不完整");
	return row;
}
function isFriendRequestDomainFailure(error) {
	return error instanceof BackendAPIError && [
		400,
		403,
		404,
		409
	].includes(error.status ?? 0);
}
async function acceptBackendFriendRequest(bid, uid, requestId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const result = parseBackendFriendMutation(await requestBackend(bid, "post_players_id_friend_requests_requestId_accept", {
		path: {
			id: uid,
			requestId
		},
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
	if (result.requestId !== requestId) throw new Error("好友申请结算响应不完整");
	return result;
}

//#endregion
export { acceptBackendFriendRequest, isFriendRequestDomainFailure, parseBackendFriendMutation };