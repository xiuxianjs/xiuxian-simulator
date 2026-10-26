import { claimBackendEmail } from "../../../api/bot/email-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/email/receiveEmail/app.ts
/** 邮件领取数据层：服务端负责邮件状态、奖励、幂等与缓存失效。 */
async function getReceiveEmailData(bid, uid, messageText, request) {
	const id = messageText.replace(/^(!|！|\/|#|＃)?领取邮件/, "").trim();
	const emailId = Number(id);
	if (!Number.isSafeInteger(emailId) || emailId < 1) return { code: "INVALID_ID" };
	try {
		await claimBackendEmail(bid, uid, emailId, request);
		return { code: "OK" };
	} catch (error) {
		logger.error("[领取邮件] 服务端操作失败:", error);
		return {
			code: "FAILED",
			displayMsg: "领取失败，邮件不存在或已领取"
		};
	}
}

//#endregion
export { getReceiveEmailData };