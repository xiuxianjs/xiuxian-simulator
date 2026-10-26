import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { issueBackendLoginWindow } from "../../../api/bot/account.js";
import "../../../api/index.js";

//#region src/response-apps/emailSecurity/login/app.ts
async function getLoginWindowData(uid, bid, isPrivate, request) {
	if (!isPrivate) return {
		code: "ERROR",
		message: "请私聊机器人发送 /登录，临时密码仅通过私聊回复。"
	};
	try {
		return {
			code: "OK",
			data: await issueBackendLoginWindow(bid, uid, request)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.code === "PASSWORD_NOT_SET") return {
			code: "PASSWORD_NOT_SET",
			message: "请先设置固定密码。"
		};
		if (error instanceof BackendAPIError && error.code === "LOGIN_RATE_LIMITED") return {
			code: "ERROR",
			message: "请稍后再试，签发间隔为 60 秒。"
		};
		return {
			code: "ERROR",
			message: getCommandErrorMessage(error)
		};
	}
}

//#endregion
export { getLoginWindowData };