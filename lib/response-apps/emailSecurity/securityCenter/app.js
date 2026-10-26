import { getBackendSecurityProfile } from "../../../api/bot/account.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/emailSecurity/securityCenter/app.ts
/**
* 安全中心 - 数据层
*/
async function getSecurityCenterData(uid, bid) {
	try {
		if (!bid) throw new Error("资料查询缺少平台身份");
		const profile = await getBackendSecurityProfile(bid);
		const id = Number(profile.playerId);
		if (!Number.isInteger(id) || id !== uid) return { code: "NOT_FOUND" };
		return {
			code: "OK",
			name: String(profile.name ?? ""),
			id,
			email: profile.email ? String(profile.email) : null,
			hasPassword: profile.hasPassword === true
		};
	} catch (error) {
		logger.error("[安全中心] 错误:", error);
		return { code: "NOT_FOUND" };
	}
}

//#endregion
export { getSecurityCenterData };