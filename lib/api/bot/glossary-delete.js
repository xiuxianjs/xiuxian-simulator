import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/glossary-delete.ts
async function getBackendGlossaryEditPermission(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	const row = await requestBackend(bid, "get_glossary_edit_permission", {});
	if (!row || typeof row.allowed !== "boolean") throw new Error("词典权限响应不完整");
	return row.allowed;
}
async function deleteBackendGlossary(bid, keyword, request) {
	if (!bid) throw new Error("删除缺少平台身份");
	const context = writeContext(request);
	return parseBackendGlossaryDelete(await requestBackend(bid, "delete_glossary_keyword", {
		headers: repeatPresentationHeaders("删除词典"),
		path: { keyword },
		...context
	}));
}
function parseBackendGlossaryDelete(row) {
	if (!row || ![
		"deleted",
		"not_found",
		"rewarded",
		"forbidden",
		"log_failed"
	].includes(row.outcome) || typeof row.stateChanged !== "boolean" || row.logWritten !== null && typeof row.logWritten !== "boolean" || row.entryId !== null && (typeof row.entryId !== "number" || !Number.isSafeInteger(row.entryId) || row.entryId <= 0)) throw new Error("词典删除响应不完整");
	const changed = row.outcome === "deleted" || row.outcome === "log_failed";
	if (row.stateChanged !== changed || (changed ? row.entryId === null : row.entryId !== null) || (row.outcome === "deleted" ? row.logWritten !== true : row.outcome === "log_failed" ? row.logWritten !== null : row.logWritten !== false)) throw new Error("词典删除阶段响应不完整");
	if (row.outcome === "log_failed") throw new Error("词条状态已删除，日志写入结果未确认");
	return row;
}

//#endregion
export { deleteBackendGlossary, getBackendGlossaryEditPermission, parseBackendGlossaryDelete };