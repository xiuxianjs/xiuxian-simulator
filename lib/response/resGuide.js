import { markdownButtonLabel } from "../utils/buttonLabel.js";
import { FormatGui } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { sendMiddlewareReply } from "./middlewareReply.js";
import { showOnboardingRecovery, startOnboardingAfterPrologue } from "./onboarding/context.js";
import { Format } from "alemonjs";

//#region src/response/resGuide.ts
const GUIDE_ACTION_BAR = [{
	label: "继续",
	command: "/继续"
}, {
	label: "跳过剧情",
	command: "/跳过引导"
}];
var resGuide_default = async (event, result) => {
	const action = result.guide;
	if (result.reason !== "GUIDE" || !action || action.action === "cleared") return true;
	for (const reply of result.replies.slice(0, -1)) await sendMiddlewareReply(event, reply);
	const presentation = action.presentation;
	if (action.action === "completed" || action.action === "skipped") try {
		if (await startOnboardingAfterPrologue(event, presentation.text)) return false;
	} catch (error) {
		await showOnboardingRecovery(event, error, presentation.text);
		return false;
	}
	const [message] = useMessage$1(event);
	const md = Format.createMarkdown();
	if (presentation.heading) {
		md.addBold(presentation.heading);
		md.addNewline();
	}
	md.addText(presentation.text);
	for (const [index, advice] of presentation.advice.entries()) {
		if (index === 0) md.addNewline();
		md.addButton(markdownButtonLabel(advice.command), { data: advice.command });
		md.addText(`：${advice.description}`);
		md.addNewline();
	}
	await message.send(FormatGui({
		isPrivate: event.isPrivate ?? event.name.startsWith("private."),
		bid: event.UserId,
		title: presentation.title,
		content: md,
		bar: presentation.showActionBar ? GUIDE_ACTION_BAR : false
	}));
	return false;
};

//#endregion
export { resGuide_default as default };