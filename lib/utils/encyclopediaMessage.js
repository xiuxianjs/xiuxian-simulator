import { FormatGui } from "./messageHelper.js";
import { createOnlineUrl } from "./onlineUrl.js";
import { Format } from "alemonjs";

//#region src/utils/encyclopediaMessage.ts
const categories = [
	"道具",
	"材料",
	"装备",
	"天工",
	"功法",
	"本命",
	"秘境",
	"凶兽",
	"货币"
];
const usage = "用法：/图鉴 [分类] [子分类]；/图鉴详情 <分类> <编号>。";
function encyclopediaUrl(target = {}) {
	const url = createOnlineUrl("/components/encyclopedia");
	if (target.category) url.searchParams.set("category", target.category);
	if (target.subCategory) url.searchParams.set("subCategory", target.subCategory);
	if (target.entryId) url.searchParams.set("entryId", String(target.entryId));
	return url.href;
}
function parseEncyclopediaLinkCommand(text, detail = false) {
	const command = detail ? "图鉴详情" : "图鉴";
	const match = text.trim().match(new RegExp(`^[/#＃]?${command}(?:\\s+(.*))?$`));
	if (!match) return usage;
	const args = match[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
	const category = args[0] === "本命物" ? "本命" : args[0];
	if (category && !categories.includes(category)) return `可查分类：${categories.join("、")}。${usage}`;
	if (detail) {
		const entryId = Number(args[1]);
		if (args.length !== 2 || !/^\d+$/.test(args[1]) || !Number.isSafeInteger(entryId) || entryId <= 0) return usage;
		return {
			category,
			entryId
		};
	}
	const legacyPage = args.length > 1 && /^p\d+$/.test(args[args.length - 1]);
	if (legacyPage) args.pop();
	if (args.length > 2) return usage;
	return {
		category,
		subCategory: args[1],
		legacyPage
	};
}
/** Public query links use the same native link buttons as battle memories. */
function EncyclopediaFormatGui(params) {
	const target = parseEncyclopediaLinkCommand(params.text, params.detail);
	const content = Format.createMarkdown();
	const valid = typeof target !== "string";
	content.addText(valid ? "图鉴已整理为网页查询，无需登录。" : target);
	if (valid && target.category) {
		content.addNewline();
		content.addText(`查阅：${[
			target.category,
			target.subCategory,
			target.entryId && `编号 ${target.entryId}`
		].filter(Boolean).join(" · ")}`);
	}
	if (valid && target.legacyPage) {
		content.addNewline();
		content.addText("旧页码参数不再使用，请在网页图鉴内继续浏览。");
	}
	return FormatGui({
		bid: params.bid,
		isPrivate: params.isPrivate,
		title: params.detail ? "图鉴详情" : "图鉴",
		content,
		keyboard: [{
			label: valid ? params.detail ? "查看图鉴详情" : "打开图鉴" : "打开全部图鉴",
			command: encyclopediaUrl(valid ? target : {}),
			type: "link"
		}],
		bar: false
	});
}

//#endregion
export { EncyclopediaFormatGui, encyclopediaUrl, parseEncyclopediaLinkCommand };