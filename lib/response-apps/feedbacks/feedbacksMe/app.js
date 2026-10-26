import { getBackendFeedbacks } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";

//#region src/response-apps/feedbacks/feedbacksMe/app.ts
/** 解析页数参数 */
function parsePageNumber(messageText) {
	const argsText = messageText.replace(/^(!|！|\/|#|＃)?(我的反馈)\s*/, "").trim();
	if (!argsText) return 1;
	const pageNum = parseInt(argsText);
	return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
}
/** 查询当前认证用户的反馈记录 */
function getUserFeedbacks(bid, page) {
	return getBackendFeedbacks(bid, page);
}

//#endregion
export { getUserFeedbacks, parsePageNumber };