import { parseBackendEmails } from "./queries.js";
import { parseEmailDetail } from "./email-detail.js";
import { emailListView } from "../../response/email/MyEmailList/view.js";
import { emailDetailView } from "../../response/email/findEmail/view.js";

//#region src/api/bot/email-robot-query.ts
function emailListArguments(text) {
	const match = text.trim().match(/^(!|！|\/|#|＃)?我的邮件\s*(\d+)?$/);
	return { pageText: String(match?.[2] ? Number(match[2]) : 1) };
}
function emailDetailArguments(text) {
	const idText = text.replace(/^(!|！|\/|#|＃)?查看邮件/, "").trim();
	return {
		idText,
		idValue: String(Number(idText))
	};
}
function parseRobotEmailList(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("邮件列表响应不完整");
	const row = value;
	if (typeof row.pageText !== "string") throw new Error("邮件列表响应不完整");
	return emailListView(parseBackendEmails(row.data), Number(row.pageText));
}
function parseRobotEmailDetail(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("邮件详情响应不完整");
	const id = value.id;
	return emailDetailView(parseEmailDetail(value, typeof id === "number" ? id : NaN));
}
/** Bind the original request ID so a valid but different mail cannot be rendered. */
function emailDetailDecoder(emailId) {
	return (value) => emailDetailView(parseEmailDetail(value, emailId));
}

//#endregion
export { emailDetailArguments, emailDetailDecoder, emailListArguments, parseRobotEmailDetail, parseRobotEmailList };