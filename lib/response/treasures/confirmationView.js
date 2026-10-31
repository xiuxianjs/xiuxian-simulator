import { addOptions, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/treasures/confirmationView.ts
const displayGrades = (line) => line.split(/(「[^」]*」)/u).map((part) => part.startsWith("「") ? part : part.replace(/((?:星尘|晓月|纯阳|仙藏)\d+)阶/gu, "$1")).join("");
function buildTreasureConfirmationView(kind, data) {
	const content = Format.createMarkdown();
	if (kind === "explore") content.addBlockquote(createQuoteMarkdown([data.summary[0]]));
	else {
		const descriptions = [];
		const batch = kind === "batch-upgrade" || kind === "batch-promote";
		data.summary.forEach((line, index) => {
			if (index === 0 || batch && (line.startsWith("「") || line.startsWith("合计提升"))) content.addText(displayGrades(line)).addNewline();
			else descriptions.push(displayGrades(line));
		});
		content.addNewline().addBlockquote(createQuoteMarkdown([
			...descriptions,
			`有效至 ${data.expiresAt.replace("T", " ").replace(/\.\d+Z$/, "Z")}`,
			"确认后按本次预览结算；重复确认只返回原操作结果。"
		]));
	}
	content.addNewline();
	addOptions(content, [{
		label: "确认",
		command: `/${kind === "daily-pack-free" ? "确认礼包" : "确认宝物"} ${data.confirmationRef}`,
		autoEnter: false
	}, {
		label: "取消并返回",
		command: kind === "daily-pack-free" ? "/充值 日礼包 30元全包" : kind === "merchant-exchange" ? "/上古遗珍 秘宝商人" : kind === "explore" || kind === "select-mythic" ? "/上古遗珍" : kind === "claimLease" ? "/我的权益 灵脉租契" : "/宝物",
		autoEnter: false
	}]);
	return content;
}

//#endregion
export { buildTreasureConfirmationView };