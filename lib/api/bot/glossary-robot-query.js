import { parseGlossaryView } from "./market-community-views.js";

//#region src/api/bot/glossary-robot-query.ts
/** 解析词典查询参数 */
function parseQueryParams(messageText) {
	const m = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?词典(?:\s+(.+?))?(?:\s*p(\d+))?$/);
	return {
		keyword: m?.[2]?.trim() ?? null,
		page: m?.[3] ? Number(m[3]) : 1
	};
}
/** 解析词典分类参数 */
function parseCategoryParams(messageText) {
	const m = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?词典分类(?:\s+(\S+))?(?:\s*p(\d+))?$/);
	return {
		category: m?.[2]?.trim() ?? null,
		page: m?.[3] ? Number(m[3]) : 1
	};
}
function parseRobotGlossaryView(value, action) {
	const data = parseGlossaryView(value, action);
	if ((action === "browse" || action === "search" && !data.exact || action === "category" && data.policy?.categoryValid) && !data.page) throw new Error("词典分页响应不完整");
	return data;
}

//#endregion
export { parseCategoryParams, parseQueryParams, parseRobotGlossaryView };