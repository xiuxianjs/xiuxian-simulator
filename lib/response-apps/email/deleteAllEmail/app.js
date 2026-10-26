import { withBackendRepeatDetection } from "../../../utils/backendRepeatDetector.js";
import { deleteAllBackendEmails } from "../../../api/bot/email-delete-all.js";
import { logger } from "alemonjs";

//#region src/response-apps/email/deleteAllEmail/app.ts
/**
* 一键删除邮件 - 数据层
*/
async function getDeleteAllEmailData(uid, bid, request) {
	try {
		const result = await deleteAllBackendEmails(bid, uid, request);
		if (result.deleted === 0) return {
			code: "EMPTY",
			displayMsg: await withBackendRepeatDetection(bid, uid, "一键删除邮件", "暂无可删除的邮件", request)
		};
		return {
			code: "DELETED",
			deleted: result.deleted
		};
	} catch (error) {
		logger.error("[一键删除邮件] 错误:", error);
		return {
			code: "EMPTY",
			displayMsg: await withBackendRepeatDetection(bid, uid, "一键删除邮件", "操作失败，请稍后再试", request)
		};
	}
}

//#endregion
export { getDeleteAllEmailData };