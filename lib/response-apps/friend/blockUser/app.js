import { MSG_COMMON, MSG_FRIEND } from "../../../constants/messages.js";
import { blockBackendUserByName } from "../../../api/bot/block-user-by-name.js";

//#region src/response-apps/friend/blockUser/app.ts
function parseBlockCommand(messageText) {
	return (messageText?.trim() ?? "").match(/^[!！/#＃]?拉黑\s+(.+)$/)?.[1]?.trim() ?? null;
}
async function App(params) {
	const result = await blockBackendUserByName(params.bid, params.uid, params.targetName, params.request, params.repeatCommand);
	if (result.outcome === "locked") return {
		code: "LOCKED",
		data: { realmName: result.realmName ?? "未知" }
	};
	if (result.outcome === "target_not_found") return {
		code: "NOT_FOUND",
		data: { message: `未找到名为「${params.targetName}」的玩家` }
	};
	if (result.outcome === "blocked") return {
		code: "OK",
		data: { message: `已将${result.name}加入黑名单` }
	};
	return {
		code: "FAIL",
		data: { message: {
			self: MSG_FRIEND.CANNOT_BLOCK_SELF,
			target_missing: MSG_FRIEND.USER_NOT_EXISTS,
			full: "黑名单数量已达上限（100人）",
			already_blocked: MSG_FRIEND.ALREADY_BLOCKED,
			failed: MSG_COMMON.OPERATION_FAILED
		}[result.outcome] }
	};
}

//#endregion
export { App as default, parseBlockCommand };