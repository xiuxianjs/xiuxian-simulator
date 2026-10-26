import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../middlewareReply.js";
import { soulWashRecoveryTips } from "../soulWashRecovery.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { Format } from "alemonjs";

//#region src/response/soulArtifact/washFeedback.ts
function soulWashFeedback(event, mode) {
	return adviceRenderer(async (reply) => {
		const [message] = useMessage$1(event);
		const md = Format.createMarkdown();
		if (reply.heading) md.addBold(reply.heading).addNewline();
		const text = reply.rawLines?.join("\n") ?? reply.text;
		const blocks = reply.rawLines ? void 0 : reply.blocks;
		md.addText(text);
		if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		const duplicate = blocks?.map((block) => block.text).join("") === text || blocks?.filter((block) => !block.quoted).map((block) => block.text).join("") === text;
		appendMiddlewareBlocks(md, duplicate ? blocks?.filter((block) => block.quoted || block.inlineButtons?.length) : blocks);
		if (mode === "confirm") md.addBlockquote(Format.createMarkdown().addText("查看面板： ").addButton(markdownButtonLabel("本命物信息"), { data: "/本命物信息" }));
		if (mode === "cancel") md.addText(" ").addButton(markdownButtonLabel("本命物信息"), { data: "/本命物信息" });
		const advice = [...reply.advice];
		for (const tip of soulWashRecoveryTips(text)) if (!advice.some((existing) => existing.command === tip.command)) advice.push({
			command: tip.command,
			description: `${tip.label}：${tip.description}`
		});
		appendMiddlewareAdvice(md, advice);
		if (reply.buttons.length) addOptions(md, reply.buttons);
		await message.send(FormatGui({
			bid: event.UserId,
			isPrivate: event.isPrivate ?? event.name.startsWith("private."),
			title: "",
			content: md
		}));
	});
}

//#endregion
export { soulWashFeedback };