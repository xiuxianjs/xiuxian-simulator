import { FormatGui, addOptions, createQuoteMarkdown } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { activeFeatureText, mentionsRetiredFeature } from "./retiredFeatures.js";
import { appendTreasureEffects } from "./treasureEffects.js";
import { Format } from "alemonjs";

//#region src/response/middlewareReply.ts
function presentMiddlewareReply(reply) {
	return {
		...reply,
		title: activeFeatureText(reply.title),
		heading: activeFeatureText(reply.heading),
		text: activeFeatureText(reply.text),
		...reply.quote === void 0 ? {} : { quote: activeFeatureText(reply.quote) },
		...reply.rawLines === void 0 ? {} : { rawLines: reply.rawLines.map(activeFeatureText).filter(Boolean) },
		...reply.blocks === void 0 ? {} : { blocks: reply.blocks.map((block) => ({
			...block,
			text: activeFeatureText(block.text),
			...block.inlineButtons === void 0 ? {} : { inlineButtons: block.inlineButtons.filter((button) => !mentionsRetiredFeature(button.command) && !mentionsRetiredFeature(button.label)) }
		})).filter((block) => block.text) },
		buttons: reply.buttons.filter((button) => !mentionsRetiredFeature(button.command) && !mentionsRetiredFeature(button.label)),
		advice: reply.advice.filter((item) => !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.description))
	};
}
function appendMiddlewareAdvice(md, advice = [], autoEnter) {
	for (const tip of advice) md.addNewline().addBlockquote(createQuoteMarkdown([tip.description], [{
		label: tip.command.replace(/^\//, ""),
		command: tip.command,
		autoEnter
	}]));
}
function appendMiddlewareBlocks(md, blocks = []) {
	for (const block of blocks) if (block.quoted) md.addBlockquote(createQuoteMarkdown(block.text.split("\n"), block.inlineButtons ?? []));
	else {
		md.addText(block.text);
		if (block.inlineButtons?.length) addOptions(md, block.inlineButtons ?? []);
		else md.addNewline();
	}
}
async function sendMiddlewareReply(event, reply, useDefaultBar = false) {
	reply = presentMiddlewareReply(reply);
	const [message] = useMessage$1(event);
	const md = Format.createMarkdown();
	if (reply.rawLines) {
		reply.rawLines.forEach((line, index) => {
			if (index > 0) md.addNewline();
			md.addText(line);
		});
		appendTreasureEffects(md, reply.treasureEffects);
		await message.send({ format: Format.create().addMarkdown(md) });
		return;
	}
	if (reply.heading) {
		md.addBold(reply.heading);
		md.addNewline();
	}
	if (!reply.blocks?.length || reply.blocks.map((block) => block.text).join("") !== reply.text && reply.blocks.filter((block) => !block.quoted).map((block) => block.text).join("") !== reply.text) md.addText(reply.text);
	if (reply.quote) md.addNewline().addBlockquote(Format.createMarkdown().addText(reply.quote));
	appendMiddlewareBlocks(md, reply.blocks);
	appendTreasureEffects(md, reply.treasureEffects);
	appendMiddlewareAdvice(md, reply.advice);
	const pageCommands = reply.nav ? /* @__PURE__ */ new Set([reply.nav.command.replace("{page}", String(reply.nav.current - 1)), reply.nav.command.replace("{page}", String(reply.nav.current + 1))]) : /* @__PURE__ */ new Set();
	const footer = reply.buttons.filter((button) => !pageCommands.has(button.command));
	await message.send(FormatGui({
		isPrivate: event.isPrivate ?? event.name.startsWith("private."),
		bid: event.UserId,
		title: reply.title,
		content: md,
		nav: reply.nav,
		...useDefaultBar === "footer" ? { footer: footer.length ? footer : void 0 } : { bar: reply.buttons.length ? reply.buttons : useDefaultBar ? void 0 : false }
	}));
}

//#endregion
export { appendMiddlewareAdvice, appendMiddlewareBlocks, presentMiddlewareReply, sendMiddlewareReply };