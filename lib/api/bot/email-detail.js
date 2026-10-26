import { requestBackend } from "./client.js";

//#region src/api/bot/email-detail.ts
async function getBackendEmailDetail(bid, uid, emailId) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseEmailDetail(await requestBackend(bid, "get_players_id_emails_emailId", { path: {
		id: uid,
		emailId
	} }), emailId);
}
function parseEmailDetail(data, emailId) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("邮件详情响应不完整");
	const row = data;
	if (!Number.isSafeInteger(row.id) || row.id !== emailId || !Number.isSafeInteger(row.state) || typeof row.time !== "string" || !Number.isFinite(Date.parse(row.time)) || typeof row.canClaim !== "boolean" || typeof row.canDelete !== "boolean" || !Object.hasOwn(row, "goods") || [
		"name",
		"subtitle",
		"data"
	].some((key) => row[key] !== null && typeof row[key] !== "string")) throw new Error("邮件详情返回对象不一致");
	return data;
}

//#endregion
export { getBackendEmailDetail, parseEmailDetail };