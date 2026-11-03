import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { createOnboardingMenu, menuPageFallback } from "./menu-pages.js";
import { appendAINarration, guideText } from "./aiNarration.js";
import { onboardingDisplayLines, onboardingFooter } from "./policy.js";
import { appendOnboardingBranchMenu, appendOnboardingEntries } from "./branchMenu.js";
import { hasBoundReturnChoices, onboardingKeyboard } from "./keyboard.js";
import { listenOnboarding, sendTeachingMessage } from "./context.js";
import { Format, markdownToPlainText } from "alemonjs";

//#region src/response/onboarding/followup.ts
async function sendOnboardingFollowup(event, followup, title, receipt) {
	const directory = followup.onboarding?.branchMenu ? createOnboardingMenu(followup.onboarding, event) : void 0;
	const view = directory?.view ?? followup.onboarding;
	if (!view && !followup.onboardingPending) return false;
	const pending = followup.onboardingPending === true || !view;
	const lines = pending ? [
		"本次操作的结算回执见上方。",
		"下一步指引暂时无法读取。",
		"可核对当前进度。"
	] : [...view.feedback.flatMap((line) => line.split("\n")), ...view.branchMenu ? [] : onboardingDisplayLines(view)];
	const buttons = pending ? [[{
		label: "核对当前进度 · /继续引导",
		command: "/继续引导"
	}], [{
		label: "任务面板 · /任务面板",
		command: "/任务面板"
	}]] : onboardingFooter(view);
	const md = Format.createMarkdown().addBlockquote(receipt).addNewline();
	for (const line of lines) md.addText(await guideText(line)).addNewline();
	if (!pending && view.branchMenu) appendOnboardingBranchMenu(md, view.branchMenu);
	if (!pending) appendOnboardingEntries(md, view.entries);
	if (!pending && view.branchMenu) await appendAINarration(md, [
		view.title,
		...view.feedback,
		...view.lines,
		...view.branchMenu?.lines ?? []
	].join("\n"));
	const active = !pending && (view.status === "active" || view.status === "soft");
	if (active) listenOnboarding(view);
	const native = !pending && !view.branchMenu && event.Platform === "qq-bot" && (active || hasBoundReturnChoices(view));
	const bubble = FormatGui({
		isPrivate: isPrivateEvent(event),
		bid: event.UserId,
		title,
		content: md,
		nav: directory?.nav,
		footer: native ? void 0 : buttons,
		bar: false
	});
	if (native) bubble.format.addButtonGroup(onboardingKeyboard(buttons));
	await sendTeachingMessage(event, bubble, [
		title,
		markdownToPlainText(receipt.value.value),
		...lines,
		...!pending && view.branchMenu ? [...view.branchMenu.lines, ...view.branchMenu.items.map((item) => `${item.name}：${item.description} · ${item.command}`)] : [],
		...!pending ? (view.entries ?? []).map((entry) => `${entry.label} · ${entry.command}`) : [],
		...menuPageFallback(directory),
		"可选指令：",
		...buttons.flat().map((button) => button.label)
	]);
	return true;
}

//#endregion
export { sendOnboardingFollowup };