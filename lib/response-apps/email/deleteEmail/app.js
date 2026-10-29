import { attemptBackendEmailDelete } from "../../../api/bot/email-delete.js";
import { withBackendRepeatDetection } from "../../../utils/backendRepeatDetector.js";
import { logger } from "alemonjs";

//#region src/response-apps/email/deleteEmail/app.ts
/**
* 删除邮件 - 数据层
*/
const MIN_ID = 1;
async function getDeleteEmailData(uid, messageText, bid, request) {
	try {
		const id = messageText.replace(/^(!|！|\/|#|＃)?删除邮件/, "").trim();
		const curId = Number(id);
		if (!Number.isSafeInteger(curId) || curId < MIN_ID) return { code: "INVALID_ID" };
		const result = await attemptBackendEmailDelete(bid, uid, curId, request);
		if (result.confirmationRequired) return {
			code: "CONFIRM",
			emailId: curId,
			expiresInSeconds: result.confirmationExpiresInSeconds
		};
		if (result.deleted) return { code: "DELETED" };
		return {
			code: "FAILED",
			displayMsg: await withBackendRepeatDetection(bid, uid, "删除邮件", "无法删除该邮件（可能已删除或邮件不存在）", request)
		};
	} catch (error) {
		logger.error("[删除邮件] 错误:", error);
		return {
			code: "FAILED",
			displayMsg: await withBackendRepeatDetection(bid, uid, "删除邮件", "操作失败，请稍后再试", request)
		};
	}
}

//#endregion
export { getDeleteEmailData };