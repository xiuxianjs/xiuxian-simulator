import { parseEmailClaim } from "./email-claim.js";
import { parseEmailClaimAll } from "./email-claim-all.js";
import { parseEmailDelete } from "./email-delete.js";
import { parseEmailDeleteAll } from "./email-delete-all.js";

//#region src/api/bot/email-actions-robot-query.ts
function emailActionArguments(text, command) {
	const pattern = command === "删除邮件" ? /^(!|！|\/|#|＃)?删除邮件/ : /^(!|！|\/|#|＃)?领取邮件/;
	const raw = text.replace(pattern, "").trim();
	const id = Number(raw);
	return { emailId: Number.isSafeInteger(id) && id >= 1 ? id : null };
}
function emailDeleteDecoder(id) {
	return (value) => {
		const result = parseEmailDelete(value, id);
		if (result.confirmationRequired) return {
			code: "CONFIRM",
			emailId: id,
			expiresInSeconds: result.confirmationExpiresInSeconds
		};
		if (!result.deleted) throw new Error("删除邮件结果不完整");
		return { code: "DELETED" };
	};
}
function emailClaimDecoder(id) {
	return (value) => parseEmailClaim(value, id);
}

//#endregion
export { emailActionArguments, emailClaimDecoder, emailDeleteDecoder, parseEmailClaimAll, parseEmailDeleteAll };