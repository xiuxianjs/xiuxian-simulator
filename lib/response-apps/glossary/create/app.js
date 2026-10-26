import { getBackendGlossaryEditQuota, getBackendGlossaryPolicy, upsertBackendGlossary } from "../../../api/bot/glossary-upsert.js";

//#region src/response-apps/glossary/create/app.ts
const checkEditQuota = getBackendGlossaryEditQuota;
const getGlossaryPolicy = getBackendGlossaryPolicy;
/** 解析录入参数 */
function parseCreateParams(messageText) {
	const stripped = (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?录入词典\s*/, "");
	if (!stripped) return { empty: true };
	const firstSpaceIdx = stripped.search(/\s/);
	let keyword;
	let rest;
	if (firstSpaceIdx === -1) {
		keyword = stripped;
		rest = "";
	} else {
		keyword = stripped.slice(0, firstSpaceIdx);
		rest = stripped.slice(firstSpaceIdx + 1).replace(/^\s+/, "");
	}
	if (!rest) return {
		empty: false,
		noContent: true,
		keyword
	};
	return {
		empty: false,
		noContent: false,
		keyword,
		content: rest
	};
}
async function createEntry(params, request) {
	const result = await upsertBackendGlossary(params.bid, params.keyword, params.content, request);
	return {
		...result,
		success: result.outcome === "created" || result.outcome === "updated"
	};
}

//#endregion
export { checkEditQuota, createEntry, getGlossaryPolicy, parseCreateParams };