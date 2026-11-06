import { section } from "../presentation/sections.js";
import { mentionsRetiredFeature } from "../retiredFeatures.js";
import "../presentation/index.js";

//#region src/response/onboarding/branchMenu.ts
function appendOnboardingBranchMenu(md, menu) {
	for (const line of menu.lines) md.addText(line).addNewline();
	for (const item of menu.items) {
		if (mentionsRetiredFeature(item.name)) continue;
		md.addBlockquote(section({
			title: item.name,
			lines: [item.description],
			actions: [{
				label: item.learned ? "再次查看" : "了解玩法",
				command: item.command,
				autoEnter: false
			}]
		})).addNewline();
	}
}
function appendOnboardingEntries(md, entries) {
	if (!entries?.length) return;
	md.addBlockquote(section({
		lines: [],
		actions: entries.map((entry) => ({
			...entry,
			autoEnter: false
		}))
	})).addNewline();
}

//#endregion
export { appendOnboardingBranchMenu, appendOnboardingEntries };