import { MSG_COMMON, MSG_FRIEND } from "../../../constants/messages.js";
import { rejectBackendFriendRequest } from "../../../api/bot/friend-request-reject.js";

//#region src/response-apps/friend/rejectBefriend/app.ts
function parseRejectCommand(messageText) {
	const match = (messageText?.trim() ?? "").match(/^[!！/#＃]?拒绝结交\s+(\d+)$/);
	if (!match) return null;
	const id = parseInt(match[1], 10);
	return isNaN(id) ? null : id;
}
async function App(params) {
	if (!Number.isFinite(params.requestId)) throw new Error("申请 ID 超出可查询范围");
	if (params.requestId >= 1e21 || BigInt(params.requestId.toString()) > 9223372036854775807n) return {
		code: "FAIL",
		data: { message: MSG_FRIEND.APPLICATION_NOT_FOUND }
	};
	const result = await rejectBackendFriendRequest(params.bid, params.uid, params.requestId, params.request, params.repeatCommand);
	if (result.outcome === "locked") return {
		code: "LOCKED",
		data: { realmName: result.realmName ?? "未知" }
	};
	if (result.outcome === "rejected") return {
		code: "OK",
		data: { fromUserName: result.listed ? result.fromUserName ?? "未知用户" : "对方" }
	};
	return {
		code: "FAIL",
		data: { message: {
			not_found: MSG_FRIEND.APPLICATION_NOT_FOUND,
			processed: MSG_FRIEND.REQUEST_PROCESSED,
			failed: MSG_COMMON.OPERATION_FAILED
		}[result.outcome] }
	};
}

//#endregion
export { App as default, parseRejectCommand };