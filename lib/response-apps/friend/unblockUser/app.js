import { MSG_COMMON } from "../../../constants/messages.js";
import { removeBackendBlocklist } from "../../../api/bot/blocklist-removal.js";

//#region src/response-apps/friend/unblockUser/app.ts
function parseUnblockCommand(messageText) {
	return (messageText?.trim() ?? "").match(/^[!！/#＃]?取消拉黑\s+(.+)$/)?.[1]?.trim() ?? null;
}
async function App(params) {
	const recordId = parseInt(params.input, 10);
	const numeric = !isNaN(recordId);
	if (numeric && !Number.isFinite(recordId)) throw new Error("记录 ID 超出可查询范围");
	const recordText = numeric ? recordId.toString() : "";
	if (numeric && (Math.abs(recordId) >= 1e21 || BigInt(recordText) < -9223372036854775808n || BigInt(recordText) > 9223372036854775807n)) return {
		code: "NOT_FOUND",
		data: { message: "该记录不存在" }
	};
	const result = await removeBackendBlocklist(params.bid, params.uid, numeric ? { recordId: recordText } : { exactName: params.input }, params.request, params.repeatCommand);
	if (result.outcome === "failed") return {
		code: "FAIL",
		data: { message: MSG_COMMON.OPERATION_FAILED }
	};
	if (result.outcome === "locked") return {
		code: "LOCKED",
		data: { realmName: result.realmName ?? "未知" }
	};
	if (result.outcome === "removed") return {
		code: "OK",
		data: { message: `已将${result.name ?? "该用户"}移出黑名单` }
	};
	if (result.outcome === "not_found") return {
		code: "NOT_FOUND",
		data: { message: numeric ? "该记录不存在" : "该用户不在黑名单中" }
	};
	return {
		code: "FAIL",
		data: { message: "该用户不在黑名单中" }
	};
}

//#endregion
export { App as default, parseUnblockCommand };