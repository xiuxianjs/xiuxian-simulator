import { mentionsRetiredFeature } from "../retiredFeatures.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { Format } from "alemonjs";

//#region src/response/onboarding/branchMenu.ts
function appendOnboardingBranchMenu(md, menu) {
	for (const line of menu.lines) md.addText(line).addNewline();
	for (const item of menu.items) {
		if (mentionsRetiredFeature(item.name)) continue;
		const quote = Format.createMarkdown();
		quote.addBold(item.name).addText(item.learned ? " · 已读" : " · 未读").addNewline();
		quote.addText(item.description).addNewline();
		quote.addButton(markdownButtonLabel(item.learned ? "再看本分支" : "学习本分支"), {
			data: item.command,
			autoEnter: false
		});
		md.addBlockquote(quote).addNewline();
	}
}
function appendOnboardingEntries(md, entries) {
	if (!entries?.length) return;
	const quote = Format.createMarkdown().addText("可选入口：").addNewline();
	for (const entry of entries) quote.addButton(markdownButtonLabel(entry.label), {
		data: entry.command,
		autoEnter: false
	}).addNewline();
	md.addBlockquote(quote).addNewline();
}

//#endregion
export { appendOnboardingBranchMenu, appendOnboardingEntries };