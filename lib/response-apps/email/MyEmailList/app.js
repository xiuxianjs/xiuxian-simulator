import { getBackendEmails } from "../../../api/bot/queries.js";
import "../../../api/index.js";
import { emailListView } from "../../../response/email/MyEmailList/view.js";
import { logger } from "alemonjs";

//#region src/response-apps/email/MyEmailList/app.ts
/**
* 我的邮件列表 - 数据层
*/
const PAGE_SIZE = 5;
async function getMyEmailListData(uid, messageText, bid) {
	try {
		const m = messageText.trim().match(/^(!|！|\/|#|＃)?我的邮件\s*(\d+)?$/);
		const page = m?.[2] ? Number(m[2]) : 1;
		const result = await getBackendEmails(bid, uid, page, PAGE_SIZE);
		return emailListView(result, page);
	} catch (error) {
		logger.error("[我的邮件] 错误:", error);
		throw error;
	}
}

//#endregion
export { getMyEmailListData };