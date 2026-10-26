import { switchBackendRole } from "../../../api/bot/account.js";
import "../../../api/index.js";

//#region src/response-apps/emailSecurity/switchUid/app.ts
function parseSwitchUid(messageText) {
	const match = messageText.trim().match(/^(?:!|！|\/|#|＃)?切换UID\s+(\d+)$/);
	const uid = match ? Number(match[1]) : NaN;
	return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
}
/** 玩家直接交换平台账号绑定，所有按 UID 关联的存档和游戏状态随角色保留。 */
async function App(params) {
	const { bid, messageText, request } = params;
	const targetUid = parseSwitchUid(messageText);
	if (!targetUid) return {
		code: "FAIL",
		data: { message: "请输入有效的正整数 UID。\n指令格式：/切换UID 目标UID" }
	};
	if (!request) return {
		code: "FAIL",
		data: { message: "当前平台消息缺少唯一标识，无法安全提交写操作" }
	};
	try {
		return {
			code: "OK",
			data: await switchBackendRole(bid, targetUid, request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "切换失败，未完成账号交换，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default, parseSwitchUid };