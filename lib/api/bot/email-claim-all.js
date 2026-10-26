import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/email-claim-all.ts
async function claimAllBackendEmails(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("邮件批量领取参数无效");
	return parseEmailClaimAll(await requestBackend(bid, "post_players_id_emails_claim_all", {
		headers: repeatPresentationHeaders("一键领取邮件"),
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseEmailClaimAll(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("批量领取邮件响应不完整");
	const result = data;
	for (const field of [
		"claimed",
		"skipped",
		"total"
	]) if (typeof result[field] !== "number" || !Number.isSafeInteger(result[field]) || result[field] < 0) throw new Error("批量领取邮件计数不完整");
	const { claimed, skipped, total } = result;
	if (claimed + skipped > total) throw new Error("批量领取邮件计数不一致");
	return {
		claimed,
		skipped,
		total
	};
}

//#endregion
export { claimAllBackendEmails, parseEmailClaimAll };