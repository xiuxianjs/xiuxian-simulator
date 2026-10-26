import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/email-delete-all.ts
async function deleteAllBackendEmails(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseEmailDeleteAll(await requestBackend(bid, "delete_players_id_emails", {
		headers: repeatPresentationHeaders("一键删除邮件"),
		path: { id: uid },
		...context
	}));
}
function parseEmailDeleteAll(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("批量删除邮件响应不完整");
	const row = data;
	if (typeof row.deleted !== "number" || !Number.isSafeInteger(row.deleted) || row.deleted < 0 || typeof row.total !== "number" || !Number.isSafeInteger(row.total) || row.total < row.deleted) throw new Error("批量删除邮件计数不完整");
	return data;
}

//#endregion
export { deleteAllBackendEmails, parseEmailDeleteAll };