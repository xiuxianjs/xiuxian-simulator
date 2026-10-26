import { FormatGui } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/soulPath/shared.ts
const addSoulQuote = (md, text) => {
	md.addBlockquote(Format.createMarkdown().addText(`${text}`));
};
/** 按服务端返回的变化行保留原卡片加粗和换行布局。 */
const addSoulEffectChanges = (md, changes, emptyMessage) => {
	for (const change of changes) {
		md.addText(`${change.label} ${change.before} → `);
		md.addBold(String(change.after));
		md.addText(`（${change.deltaText}）`);
		md.addNewline();
	}
	if (emptyMessage) addSoulQuote(md, emptyMessage);
};
const getCommandArgument = (messageText, command) => {
	const text = messageText?.trim() ?? "";
	const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.match(new RegExp(`^[!！/#＃]?${escaped}\\s+(.+)$`))?.[1]?.trim() ?? "";
};
const sendSoulGui = (e, title, content, footer = []) => {
	const [isPrivate, bid] = [e.isPrivate ?? e.name?.startsWith("private.") ?? false, e?.UserId];
	const navigation = (Array.isArray(footer[0]) ? footer : [footer]).filter((row) => row.length > 0);
	return FormatGui({
		isPrivate,
		bid,
		title,
		content,
		footer: navigation
	});
};
const isSoulConfirmationToken = (token) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token);

//#endregion
export { addSoulEffectChanges, addSoulQuote, getCommandArgument, isSoulConfirmationToken, sendSoulGui };