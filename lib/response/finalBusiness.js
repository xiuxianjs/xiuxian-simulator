import { markdownButtonLabel } from "../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "./middlewareReply.js";
import { adviceRenderer } from "./feedbackRenderer.js";
import { SHOP_META } from "./shop/meta.js";
import { runRobotBusiness } from "./robotBusiness.js";
import { Format } from "alemonjs";

//#region src/response/finalBusiness.ts
async function loadFinalBusiness(event, next, operation, args, decode) {
	try {
		const result = await runRobotBusiness(event, operation, args, decode, next, adviceRenderer((reply) => renderFinalRefusal(event, operation, reply)));
		if (result.handled) return result;
		return {
			handled: false,
			load: () => Promise.resolve(result.data),
			...result.onboarding ? { onboarding: result.onboarding } : {},
			...result.onboardingPending ? { onboardingPending: true } : {}
		};
	} catch (error) {
		return {
			handled: false,
			load: () => Promise.reject(error)
		};
	}
}
async function renderFinalRefusal(event, operation, reply) {
	const [message] = useMessage$1(event);
	const md = Format.createMarkdown();
	let footer = reply.buttons.length ? reply.buttons : void 0;
	let title = reply.title;
	if ([
		"items.consume",
		"soul-artifacts.refine",
		"peiyuan.confirm",
		"mingwu.confirm"
	].includes(operation) && reply.heading) md.addBold(reply.heading).addNewline();
	if (operation === "tribulation.command" || operation === "tribulation.public") {
		md.addBlockquote(createQuoteMarkdown(reply.text.split("\n"), reply.buttons));
		footer = void 0;
	} else if (operation === "realm.promotion") {
		md.addText("晋级失败").addNewline().addText(reply.text).addNewline();
		if (reply.quote) md.addBlockquote(createQuoteMarkdown(reply.quote.split("\n"))).addNewline();
		for (const block of reply.blocks ?? []) {
			if (block.text === reply.text) continue;
			md.addNewline();
			for (const line of block.text.split("\n")) md.addText(line).addNewline();
		}
	} else if (operation === "meditation.start" && reply.quote) {
		const inline = reply.buttons[0];
		md.addBlockquote(Format.createMarkdown().addText(reply.quote).addButton(markdownButtonLabel(inline.label), { data: inline.command }));
		footer = reply.buttons.slice(1);
	} else {
		md.addText(reply.text);
		if (operation === "lootboxes.open" || operation === "items.detail" || operation === "items.consume" || operation === "soul-artifacts.refine" || operation === "peiyuan.confirm" || operation === "mingwu.confirm") {
			if (reply.quote) md.addNewline().addBlockquote(createQuoteMarkdown(reply.quote.split("\n")));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
		}
		if (operation === "items.consume" || operation === "soul-artifacts.refine") md.addNewline();
		if (operation === "shops.purchase") title = SHOP_META[reply.heading]?.name ?? "商店";
	}
	appendMiddlewareAdvice(md, reply.advice);
	await message.send(FormatGui({
		isPrivate: event.isPrivate ?? event.name.startsWith("private."),
		bid: event.UserId,
		title,
		content: md,
		footer
	}));
}

//#endregion
export { loadFinalBusiness };