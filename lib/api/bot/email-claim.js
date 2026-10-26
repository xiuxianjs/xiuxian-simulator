import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/email-claim.ts
async function claimBackendEmail(bid, uid, emailId, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(emailId) || emailId <= 0) throw new Error("邮件领取参数无效");
	return parseEmailClaim(await requestBackend(bid, "post_players_id_emails_emailId_claim", {
		headers: repeatPresentationHeaders("领取邮件"),
		path: {
			id: uid,
			emailId
		},
		...writeContext(request)
	}), emailId);
}
function parseEmailClaim(data, emailId) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("邮件领取响应不完整");
	const result = data;
	if (result.emailId !== emailId) throw new Error("邮件领取响应不完整");
	return {
		emailId,
		issued: parsePositiveIssuedRewards(result.issued, "邮件领取响应不完整")
	};
}

//#endregion
export { claimBackendEmail, parseEmailClaim };