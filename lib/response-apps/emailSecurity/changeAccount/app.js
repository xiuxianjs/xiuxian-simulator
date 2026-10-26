import { beginBackendEmailVerification } from "../../../api/bot/account.js";
import "../../../api/index.js";

//#region src/response-apps/emailSecurity/changeAccount/app.ts
/** Go 服务端负责同邮箱校验、验证码、双角色锁、绑定交换及缓存失效。 */
async function initiateChangeAccount(params) {
	const targetUserId = parseTargetUid(params.messageText);
	if (!targetUserId) return {
		code: "FAIL",
		data: { message: "请输入正确的目标用户UID格式\n指令格式：/更换账号 [目标用户UID]" }
	};
	if (!params.request) return {
		code: "FAIL",
		data: { message: "当前平台消息缺少唯一标识，无法安全提交写操作" }
	};
	try {
		const data = await beginBackendEmailVerification(params.bid, "change", String(targetUserId), params.request);
		if (typeof data.currentEmail !== "string") throw new Error("邮箱验证响应不完整");
		return {
			code: "OK",
			data: {
				currentUserEmail: String(data.currentEmail ?? ""),
				targetUserName: String(data.targetName ?? targetUserId),
				targetUserId
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "更换账号失败，请稍后再试" }
		};
	}
}
function parseTargetUid(messageText) {
	const cleanText = messageText.replace(/^(!|！|\/|#|＃)?(更换账号)\s*/, "").trim();
	const uid = Number(cleanText);
	return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
}

//#endregion
export { initiateChangeAccount, parseTargetUid };