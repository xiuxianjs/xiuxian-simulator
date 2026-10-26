import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendEmailDetail } from "../../../api/bot/email-detail.js";
import { emailDetailView } from "../../../response/email/findEmail/view.js";
import { logger } from "alemonjs";

//#region src/response-apps/email/findEmail/app.ts
/**
* 查看邮件 - 数据层
*/
async function getFindEmailData(uid, messageText, bid) {
	const id = messageText.replace(/^(!|！|\/|#|＃)?查看邮件/, "").trim();
	try {
		const emailId = Number(id);
		if (!Number.isFinite(emailId)) throw new Error("邮件编号不是有限数字");
		if (emailId <= 0 || emailId >= 2 ** 63 || !Number.isInteger(emailId)) return {
			code: "NOT_FOUND",
			emailId: id
		};
		const result = await getBackendEmailDetail(bid, uid, emailId);
		if (!result) return {
			code: "NOT_FOUND",
			emailId: id
		};
		return emailDetailView(result);
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 404) return {
			code: "NOT_FOUND",
			emailId: id
		};
		logger.error("[查看邮件] 错误:", error);
		return {
			code: "NOT_FOUND",
			emailId: messageText
		};
	}
}

//#endregion
export { getFindEmailData };