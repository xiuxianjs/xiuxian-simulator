import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/friend-request-reject.ts
async function rejectBackendFriendRequest(bid, uid, requestId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendFriendReject(await requestBackend(bid, "post_players_id_friend_requests_requestId_reject", {
		path: {
			id: uid,
			requestId
		},
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseBackendFriendReject(result) {
	if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("拒绝申请响应不完整");
	const row = result;
	if (typeof row.outcome !== "string" || ![
		"rejected",
		"not_found",
		"processed",
		"locked",
		"failed"
	].includes(row.outcome) || typeof row.listed !== "boolean" || row.fromUserName !== null && typeof row.fromUserName !== "string" || row.realmName !== null && typeof row.realmName !== "string" || !row.listed && row.fromUserName !== null || row.outcome !== "rejected" && row.listed) throw new Error("拒绝申请响应不完整");
	return row;
}

//#endregion
export { parseBackendFriendReject, rejectBackendFriendRequest };