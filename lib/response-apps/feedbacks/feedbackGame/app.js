import { getBackendFeedbackCategories, submitBackendFeedback } from "../../../api/bot/feedback-submit.js";
import { logger } from "alemonjs";

//#region src/response-apps/feedbacks/feedbackGame/app.ts
/** 解析命令参数 */
function parseCommand(messageText) {
	const argsText = messageText.replace(/^(!|！|\/|#|＃)?(提交反馈|反馈)\s*/, "").trim();
	if (!argsText) return {
		categoryId: null,
		content: null
	};
	const parts = argsText.split(/\s+/);
	const firstPart = parts[0];
	const categoryId = parseInt(firstPart);
	if (isNaN(categoryId)) return {
		categoryId: null,
		content: argsText
	};
	return {
		categoryId,
		content: parts.slice(1).join(" ").trim() || null
	};
}
async function getEnabledCategories(bid) {
	try {
		return await getBackendFeedbackCategories(bid);
	} catch (error) {
		logger.error("获取分类列表失败:", error);
		return [];
	}
}
async function validateCategory(bid, categoryId) {
	return (await getEnabledCategories(bid)).find((category) => category.id === categoryId) ?? null;
}
const MAX_DAILY_PENDING = 3;
const FEEDBACK_VALIDATION_MESSAGES = {
	empty: "内容不能为空",
	too_short: "内容长度不能少于10个字符",
	too_long: "内容长度不能超过200个字符",
	not_meaningful: "请输入有意义的内容，不能全是数字或特殊字符",
	sensitive: "内容包含违规词汇，请修改后重试"
};
async function submitFeedback(bid, categoryId, content, request) {
	if (!Number.isFinite(categoryId) || categoryId < 0 || categoryId >= 0x8000000000000000) return {
		outcome: "category_unavailable",
		feedbackId: null,
		pendingCount: null
	};
	return await submitBackendFeedback(bid, categoryId, content, request);
}

//#endregion
export { FEEDBACK_VALIDATION_MESSAGES, MAX_DAILY_PENDING, getEnabledCategories, parseCommand, submitFeedback, validateCategory };