import { FormatGui } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/glossary/feedback.ts
function glossaryFeedbackMessage(event, reply) {
	const content = Format.createMarkdown();
	const lines = reply.blocks?.map((block) => block.text) ?? [reply.text];
	for (const [index, line] of lines.entries()) {
		if (index) content.addNewline();
		content.addText(line);
	}
	return FormatGui({
		isPrivate: event.isPrivate ?? false,
		bid: event.UserId,
		title: reply.title || "词典",
		content,
		footer: reply.buttons.map((button) => ({
			label: button.label,
			command: button.command
		}))
	});
}

//#endregion
export { glossaryFeedbackMessage };