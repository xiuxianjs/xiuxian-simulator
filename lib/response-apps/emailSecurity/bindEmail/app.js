import { beginBackendEmailVerification } from "../../../api/bot/account.js";
import "../../../api/index.js";

//#region src/response-apps/emailSecurity/bindEmail/app.ts
/**
* 机器人只解析指令并发起服务端邮箱验证；发送次数、验证码、锁与绑定写入
* 均由 Go 的 EmailSecurityService 管理。
*/
async function initiateBindEmail(params) {
	const email = parseEmailAddress(params.messageText);
	if (!email) return {
		code: "FAIL",
		data: { message: "请输入邮箱地址，格式：/绑定邮箱 [邮箱地址]" }
	};
	if (!params.request) return {
		code: "FAIL",
		data: { message: "当前平台消息缺少唯一标识，无法安全提交写操作" }
	};
	try {
		await beginBackendEmailVerification(params.bid, "bind", email, params.request);
		return {
			code: "OK",
			data: { email }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "绑定邮箱失败，请稍后再试" }
		};
	}
}
function parseEmailAddress(messageText) {
	return messageText.replace(/^(!|！|\/|#|＃)?(绑定邮箱)\s*/, "").trim() || null;
}

//#endregion
export { initiateBindEmail, parseEmailAddress };