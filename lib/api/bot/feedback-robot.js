import { parseBackendFeedbackSubmit } from "./feedback-submit.js";

//#region src/api/bot/feedback-robot.ts
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
/** 解析反馈ID参数 */
function parseFeedbackId(messageText) {
	const argsText = messageText.replace(/^(!|！|\/|#|＃)?(查看反馈)\s*/, "").trim();
	if (!argsText) return null;
	const feedbackId = parseInt(argsText);
	return isNaN(feedbackId) ? null : feedbackId;
}
/** 解析页数参数 */
function parsePageNumber(messageText) {
	const argsText = messageText.replace(/^(!|！|\/|#|＃)?(我的反馈)\s*/, "").trim();
	if (!argsText) return 1;
	const pageNum = parseInt(argsText);
	return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
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
function parseRobotFeedbackCompose(value) {
	if (value && Array.isArray(value.categories)) return {
		categories: value.categories.map((row) => {
			if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.name !== "string") throw new Error("反馈分类响应不完整");
			return {
				id: row.id,
				name: row.name
			};
		}),
		result: null
	};
	const result = parseBackendFeedbackSubmit(value);
	if (result.outcome !== "submitted") throw new Error("反馈提交响应不完整");
	return {
		categories: [],
		result
	};
}

//#endregion
export { formatFeedbackInfo, parseCommand, parseFeedbackId, parsePageNumber, parseRobotFeedbackCompose };