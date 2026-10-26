import { FormatGui, createQuoteMarkdown } from "./messageHelper.js";
import { parseGameTime } from "./gameTime.js";
import { Format } from "alemonjs";

//#region src/utils/flyMailPresentation.ts
const flyMailLabels = {
	friend: "好友飞信",
	master: "师门飞信",
	guild: "宗门飞信",
	companion: "道侣飞信",
	team: "队伍飞信"
};
const flyMailViewCommand = (scope, conversationId) => scope === "friend" ? conversationId ? `/飞信 会话 ${conversationId}` : "/飞信" : `/飞信 ${{
	master: "师门",
	guild: "宗门",
	companion: "道侣",
	team: "队伍"
}[scope]}`;
function flyMailDraft(scope, targetUid) {
	if (scope === "friend") return targetUid ? `/发飞信 ${targetUid} ` : "/我的好友";
	return `/发${flyMailLabels[scope]} `;
}
function flyMailTime(value, now = Date.now()) {
	const time = parseGameTime(value);
	const current = parseGameTime(now);
	if (!time || !current) return "时间未知";
	return time.format(time.isSame(current, "day") ? "HH:mm" : time.year() === current.year() ? "MM-DD HH:mm" : "YYYY-MM-DD HH:mm");
}
function flyMailQuote(item, viewerUid) {
	const own = item.senderUid === viewerUid;
	const label = [
		"master",
		"guild",
		"team"
	].includes(item.scope) ? `回复${flyMailLabels[item.scope].replace("飞信", "")}` : "回复";
	return createQuoteMarkdown([
		`${own ? "我" : item.senderName} · ${flyMailTime(item.createdAt)}`,
		"",
		item.content
	], !own && item.senderUid > 0 && item.conversationId > 0 ? [{
		label,
		command: flyMailDraft(item.scope, item.senderUid)
	}] : []);
}
function parseFlyMailNotice(raw) {
	if (!raw || typeof raw !== "object") return;
	const item = raw;
	if (typeof item.scope !== "string" || !Object.hasOwn(flyMailLabels, item.scope) || ![
		"messageId",
		"conversationId",
		"senderUid"
	].every((key) => typeof item[key] === "number" && Number.isSafeInteger(item[key]) && Number(item[key]) > 0) || typeof item.senderName !== "string" || typeof item.content !== "string" || typeof item.createdAt !== "string" || !parseGameTime(item.createdAt)) return;
	return item;
}
function flyMailNoticeData(raw, viewerUid) {
	const item = parseFlyMailNotice(raw);
	if (!item || item.senderUid === viewerUid) return;
	return FormatGui({
		mention: false,
		bar: false,
		title: flyMailLabels[item.scope],
		content: Format.createMarkdown().addBlockquote(flyMailQuote(item, viewerUid)),
		footer: [{
			label: item.scope === "friend" ? "查看会话" : "查看飞信",
			command: flyMailViewCommand(item.scope, item.conversationId)
		}]
	}).format.value;
}

//#endregion
export { flyMailDraft, flyMailLabels, flyMailNoticeData, flyMailQuote, flyMailTime, flyMailViewCommand, parseFlyMailNotice };