import { getBackendGlossary, getBackendGlossaryEntry } from "../../../api/bot/glossary-queries.js";
import { getBackendGlossaryPolicy } from "../../../api/bot/glossary-upsert.js";

//#region src/response-apps/glossary/query/app.ts
/** 解析词典查询参数 */
function parseQueryParams(messageText) {
	const m = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?词典(?:\s+(.+?))?(?:\s*p(\d+))?$/);
	return {
		keyword: m?.[2]?.trim() ?? null,
		page: m?.[3] ? Number(m[3]) : 1
	};
}
/** 获取最近词条列表 */
function getEntryList(page, bid) {
	return getBackendGlossary(bid, page);
}
/** 精确查询词条 */
function getExactEntry(keyword, bid) {
	return getBackendGlossaryEntry(bid, keyword);
}
/** 模糊搜索词条 */
function searchEntries(keyword, page, bid) {
	return getBackendGlossary(bid, page, { keyword });
}
const getGlossaryPolicy = getBackendGlossaryPolicy;

//#endregion
export { getEntryList, getExactEntry, getGlossaryPolicy, parseQueryParams, searchEntries };