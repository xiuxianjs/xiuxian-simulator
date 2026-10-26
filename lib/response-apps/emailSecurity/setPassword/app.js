import { BackendAPIError } from "../../../api/bot/client.js";
import { setBackendPassword } from "../../../api/bot/account.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/emailSecurity/setPassword/app.ts
/**
* 设置密码 - 数据层
*/
function responseMinLength(error) {
	const details = error.details;
	if (typeof details !== "object" || details === null || !("minLength" in details)) return;
	const minLength = details.minLength;
	return Number.isInteger(minLength) && Number(minLength) > 0 ? Number(minLength) : void 0;
}
async function getSetPasswordData(uid, bid, isPrivate, messageText, request) {
	try {
		if (!isPrivate) return { code: "NOT_PRIVATE" };
		const password = (messageText ?? "").trim().match(/设置密码\s+(.+)/)?.[1]?.trim();
		if (!request) return { code: "USER_NOT_FOUND" };
		const data = await setBackendPassword(bid, uid, password ?? "", request);
		return {
			code: "OK",
			bid: data.bid,
			uid: data.playerId
		};
	} catch (error) {
		logger.error("[设置密码] 错误:", error);
		if (error instanceof BackendAPIError) {
			const minLength = responseMinLength(error);
			if (error.code === "PASSWORD_REQUIRED" && minLength !== void 0) return {
				code: "NO_PASSWORD",
				minLength
			};
			if (error.code === "PASSWORD_TOO_SHORT" && minLength !== void 0) return {
				code: "TOO_SHORT",
				minLength
			};
		}
		return { code: "USER_NOT_FOUND" };
	}
}

//#endregion
export { getSetPasswordData };