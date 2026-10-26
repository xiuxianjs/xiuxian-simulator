import { deleteBackendGlossary, getBackendGlossaryEditPermission } from "../../../api/bot/glossary-delete.js";

//#region src/response-apps/glossary/delete/app.ts
function checkDeleteWhitelist(bid) {
	return getBackendGlossaryEditPermission(bid);
}
/** 解析删除参数 */
function parseDeleteParams(messageText) {
	return (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?删除词典\s*/, "").trim();
}
async function deleteEntry(bid, keyword, request) {
	const result = await deleteBackendGlossary(bid, keyword, request);
	if (result.outcome === "deleted") return {
		success: true,
		forbidden: false
	};
	const reason = result.outcome === "rewarded" ? "该词条已发放奖励，不可删除，但仍可继续修改" : "词条不存在或已被删除";
	return {
		success: false,
		forbidden: result.outcome === "forbidden",
		reason
	};
}

//#endregion
export { checkDeleteWhitelist, deleteEntry, parseDeleteParams };