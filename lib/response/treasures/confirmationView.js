import { createQuoteMarkdown } from "../../utils/messageHelper.js";
import { treasureAttributeNames } from "../../api/bot/treasures.js";
import { Format } from "alemonjs";

//#region src/response/treasures/confirmationView.ts
function battleChanges({ before, after }) {
	const changes = [];
	const number = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format;
	for (const key of Object.keys(treasureAttributeNames)) {
		const label = treasureAttributeNames[key];
		if (before.attributes[key] !== after.attributes[key]) changes.push(`${label} +${number(before.attributes[key])} → ${label} +${number(after.attributes[key])}`);
		if (before.percentAttributes[key] !== after.percentAttributes[key]) changes.push(`${label} +${number(before.percentAttributes[key])}% → ${label} +${number(after.percentAttributes[key])}%`);
	}
	return changes.length ? changes : ["战斗属性不变"];
}
const displayGrades = (line) => line.split(/(「[^」]*」)/u).map((part) => part.startsWith("「") ? part : part.replace(/((?:星尘|晓月|纯阳|仙藏)\d+)阶/gu, "$1")).join("");
function buildTreasureConfirmationView(kind, data, returnCommand) {
	const content = Format.createMarkdown();
	const expiresAt = data.expiresAt.replace("T", " ").replace(/\.\d+Z$/, "Z");
	if (kind === "explore") content.addBlockquote(createQuoteMarkdown([data.summary[0], `有效期：至 ${expiresAt}`]));
	else {
		const descriptions = [];
		const batch = kind === "batch-upgrade" || kind === "batch-promote";
		data.summary.forEach((line, index) => {
			if (index === 0 || batch && (line.startsWith("「") || line.startsWith("合计提升"))) content.addText(displayGrades(line)).addNewline();
			else descriptions.push(displayGrades(line));
		});
		content.addNewline().addBlockquote(createQuoteMarkdown([
			...data.cultivationChange ? battleChanges(data.cultivationChange) : [],
			...descriptions,
			`有效至 ${expiresAt}`,
			"确认后按本次预览结算；重复确认只返回原操作结果。"
		]));
	}
	content.addNewline();
	return {
		content,
		actions: [{
			label: "确认",
			command: `/${kind === "daily-pack-free" ? "确认礼包" : "确认宝物"} ${data.confirmationRef}`,
			autoEnter: false
		}, {
			label: "取消并返回",
			command: returnCommand ?? (kind === "daily-pack-free" ? "/充值 日礼包 30元全包" : kind === "merchant-exchange" ? "/上古遗珍 秘宝商人" : kind === "explore" || kind === "select-mythic" ? "/上古遗珍" : kind === "claimLease" ? "/我的权益 灵脉租契" : "/宝物"),
			autoEnter: false
		}]
	};
}

//#endregion
export { buildTreasureConfirmationView };