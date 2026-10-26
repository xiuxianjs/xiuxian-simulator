import { SDKError } from "../api/core/error.js";
import { UNKNOWN_BATTLE_RESULT } from "../api/bot/battle-request.js";

//#region src/utils/commandError.ts
/** Only business rejections may expose backend text in a player reply. */
function getCommandErrorMessage(error) {
	if (error instanceof SDKError && [
		"SDK_TIMEOUT",
		"SDK_NETWORK_ERROR",
		"SDK_ABORTED",
		"SDK_INVALID_RESPONSE"
	].includes(error.code) && error.message === "战斗结果暂未确认，请先查看角色状态和战斗记录，避免重复操作。") return UNKNOWN_BATTLE_RESULT;
	if (error instanceof SDKError && error.status === 503 && (error.code === "TRIBULATION_EVENTS_DISABLED" || error.code === "SERVICE_UNAVAILABLE" && error.message === "新渡劫事件与观望尚未开放")) return "新渡劫尚未开放，暂时无法查询劫云。";
	return getCommandBusinessErrorMessage(error) ?? "服务暂时不可用，请稍后再试";
}
/** Undefined means the caller must keep its transport/internal error handling. */
function getCommandBusinessErrorMessage(error) {
	if (error instanceof SDKError && [
		400,
		403,
		404,
		409,
		422
	].includes(error.status ?? 0) && !error.code.startsWith("SDK_") && ![
		"INTERNAL",
		"UNAUTHORIZED",
		"UNAVAILABLE"
	].includes(error.code) && error.message.trim()) return error.message;
}

//#endregion
export { getCommandBusinessErrorMessage, getCommandErrorMessage };