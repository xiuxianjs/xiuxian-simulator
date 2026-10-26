import { getBackendFeedbackDetail } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/feedbacks/feedbackInfo/app.ts
/** 解析反馈ID参数 */
function parseFeedbackId(messageText) {
	const argsText = messageText.replace(/^(!|！|\/|#|＃)?(查看反馈)\s*/, "").trim();
	if (!argsText) return null;
	const feedbackId = parseInt(argsText);
	return isNaN(feedbackId) ? null : feedbackId;
}
/** 根据ID查询当前认证用户的反馈记录 */
async function getFeedbackById(feedbackId, bid) {
	try {
		if (feedbackId < 1) return null;
		return await getBackendFeedbackDetail(bid, feedbackId);
	} catch (error) {
		logger.error("查询反馈记录失败:", error);
		return null;
	}
}
/** 格式化反馈信息为显示文本 */
function formatFeedbackInfo(feedback) {
	let message = "";
	if (feedback.isReplied && feedback.reply) {
		message += "【反馈】\n";
		const categoryName = feedback["category.name"] ?? "未分类";
		message += `分类：${categoryName}\n`;
		message += `内容：${feedback.content}\n\n`;
		message += "【回复】\n";
		message += `内容：${feedback.reply}`;
	} else message += `反馈信息id:${feedback.id}未收到回复`;
	return message;
}

//#endregion
export { formatFeedbackInfo, getFeedbackById, parseFeedbackId };