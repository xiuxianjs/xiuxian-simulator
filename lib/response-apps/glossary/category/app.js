import { getBackendGlossaryPolicy } from "../../../api/bot/glossary-upsert.js";
import { getBackendGlossary } from "../../../api/bot/glossary-queries.js";

//#region src/response-apps/glossary/category/app.ts
/** 解析词典分类参数 */
function parseCategoryParams(messageText) {
	const m = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?词典分类(?:\s+(\S+))?(?:\s*p(\d+))?$/);
	return {
		category: m?.[2]?.trim() ?? null,
		page: m?.[3] ? Number(m[3]) : 1
	};
}
const getGlossaryPolicy = getBackendGlossaryPolicy;
/** 获取分类词条列表 */
function getCategoryEntries(page, category, bid) {
	return getBackendGlossary(bid, page, { category });
}

//#endregion
export { getCategoryEntries, getGlossaryPolicy, parseCategoryParams };