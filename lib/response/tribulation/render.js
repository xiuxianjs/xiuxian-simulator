import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/tribulation/render.ts
function renderTribulationPanel(panel, params) {
	const content = Format.createMarkdown();
	if (!panel.sections.length && panel.emptyText) content.addText(panel.emptyText);
	for (const section of panel.sections) {
		content.addBlockquote(createQuoteMarkdown(section.lines, section.buttons));
		content.addNewline();
	}
	return FormatGui({
		...params,
		title: panel.title,
		content,
		header: panel.header,
		nav: panel.nav,
		footer: panel.footer
	});
}

//#endregion
export { renderTribulationPanel };