import { isRecord } from "../core/helpers.js";
import { BackendAPIError } from "./client.js";

//#region src/api/bot/account-validation.ts
function requireAccountResponse(valid, request) {
	if (!valid) throw new BackendAPIError("账号接口返回不完整，请更新服务端后重试", "SDK_INVALID_RESPONSE", void 0, request?.requestId);
}
function validProfile(data) {
	return isRecord(data) && Number.isInteger(data.playerId) && Number(data.playerId) > 0 && typeof data.name === "string" && typeof data.email === "string" && typeof data.hasPassword === "boolean" && Number.isInteger(data.emailChangeCount) && (data.previousEmail === null || typeof data.previousEmail === "string");
}
function validPasswordResult(data) {
	return isRecord(data) && data.updated === true && Number.isInteger(data.playerId) && Number(data.playerId) > 0 && typeof data.bid === "string" && data.bid.length > 0 && Number.isInteger(data.minLength) && Number(data.minLength) > 0;
}
function validEmailBegin(data, type) {
	return isRecord(data) && data.type === type && Number.isInteger(data.expiresIn) && Number.isInteger(data.remainingToday) && (data.targetName === void 0 || typeof data.targetName === "string");
}
function validEmailConfirm(data, type) {
	if (!isRecord(data) || data.type !== type || data.verified !== true) return false;
	switch (type) {
		case "bind": return typeof data.email === "string";
		case "changeEmail": return typeof data.oldEmail === "string" && typeof data.newEmail === "string";
		case "change": return typeof data.fromName === "string" && typeof data.toName === "string";
		default: return false;
	}
}
function validRoleSwitch(data) {
	return isRecord(data) && Number.isInteger(data.fromUid) && Number(data.fromUid) > 0 && typeof data.fromName === "string" && Number.isInteger(data.toUid) && Number(data.toUid) > 0 && typeof data.toName === "string" && typeof data.cacheCleared === "boolean";
}

//#endregion
export { requireAccountResponse, validEmailBegin, validEmailConfirm, validPasswordResult, validProfile, validRoleSwitch };