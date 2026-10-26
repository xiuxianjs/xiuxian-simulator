import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseOnboarding } from "../../api/bot/onboarding.js";
import { requestRobotBusiness } from "../../api/bot/robot-business.js";
import { sendMiddlewareReply } from "../middlewareReply.js";
import { canonicalOnboardingCommand, isOnboardingAddressed, isOnboardingHelp, isOnboardingResolution, onboardingButtonVersion, onboardingDisplayLines, onboardingFooter } from "./policy.js";
import { hasBoundReturnChoices, onboardingKeyboard } from "./keyboard.js";
import { Format, ResultCode, configureContext, createContext, logger } from "alemonjs";

//#region src/response/onboarding/context.ts
const onboarding = createContext({
	name: "xiuxian-onboarding",
	events: [
		"message.create",
		"private.message.create",
		"interaction.create",
		"private.interaction.create"
	],
	scope: ["Platform", "UserId"],
	expiresIn: "30m",
	onError: "keep",
	initialState: (payload) => ({ view: payload }),
	handlers: { async listen(event, state, action) {
		const gameEvent = event;
		const text = String(gameEvent.MessageText ?? "");
		if (!isOnboardingAddressed(gameEvent, state.view)) {
			action.pass();
			return;
		}
		const command = canonicalOnboardingCommand(text);
		const buttonVersion = onboardingButtonVersion(gameEvent);
		if (isOnboardingResolution(command, state.view) && buttonVersion === void 0) {
			action.close();
			action.pass();
			return;
		}
		if (command === "继续引导" || command === "退出引导" || isOnboardingHelp(command)) {
			action.pass();
			return;
		}
		const choice = state.view.actions.find((button) => canonicalOnboardingCommand(button.command) === command);
		if (!choice) {
			if (state.view.status === "soft" && buttonVersion === void 0) {
				action.close();
				action.pass();
				return;
			}
		}
		try {
			const execute = buttonVersion !== null && (choice !== void 0 || buttonVersion !== void 0);
			const result = await requestRobotBusiness(gameEvent, execute ? "onboarding.action" : "onboarding.view", execute ? {
				version: buttonVersion ?? state.view.version,
				command: choice?.command ?? text.trim()
			} : {}, parseOnboarding);
			if (result.success && result.branch === "business") {
				if (execute && typeof buttonVersion === "number") result.data.feedback.unshift(`你选择了：${text.trim()}`);
				if (!execute) result.data.feedback.push("先选择当前目标；也可以暂离教学后自由探索，进度会保留。");
				await showOnboarding(gameEvent, result.data);
			} else for (const reply of result.middleware.replies) await sendMiddlewareReply(gameEvent, reply);
		} catch (error) {
			await showOnboardingRecovery(gameEvent, error);
		}
	} }
});
const onboardingContent = configureContext({ contexts: { onboarding } });
function listenOnboarding(view) {
	onboarding.listen(view);
}
async function sendTeachingMessage(event, bubble, lines) {
	const [message] = useMessage$1(event);
	const delivered = async (payload) => {
		try {
			const receipts = await message.send(payload);
			return receipts.length > 0 && receipts.every((receipt) => receipt.code === ResultCode.Ok);
		} catch {
			return false;
		}
	};
	if (await delivered(bubble)) return;
	const text = ["按钮气泡未确认送达，以下为同一教学进度的文字版；可手动发送末尾指令。", ...lines].join("\n");
	if (!await delivered({ format: Format.create().addText(text) })) logger.warn("[onboarding] 按钮与文字消息均未确认送达；保留当前上下文，不重放教学操作。");
}
async function showOnboarding(event, view, introduction) {
	const md = Format.createMarkdown();
	if (introduction) md.addBlockquote(createQuoteMarkdown(introduction.split("\n")));
	if (view.feedback.length) md.addBlockquote(createQuoteMarkdown(view.feedback.flatMap((line) => line.split("\n"))));
	for (const line of onboardingDisplayLines(view)) md.addText(line).addNewline();
	const active = view.status === "active" || view.status === "soft";
	const buttons = onboardingFooter(view);
	if (active) listenOnboarding(view);
	else onboarding.cancel();
	const choices = buttons.flat().map((button) => button.label.includes(button.command) ? button.label : `${button.label} · ${button.command}`);
	const native = event.Platform === "qq-bot" && (active || hasBoundReturnChoices(view));
	const bubble = FormatGui({
		isPrivate: isPrivateEvent(event),
		bid: event.UserId,
		title: view.title,
		content: md,
		footer: native ? void 0 : buttons,
		bar: false
	});
	if (native) bubble.format.addButtonGroup(onboardingKeyboard(event.UserId, view, buttons));
	await sendTeachingMessage(event, bubble, [
		view.title,
		...introduction ? [introduction] : [],
		...view.feedback,
		...onboardingDisplayLines(view),
		"可选指令：",
		...choices
	]);
}
async function showOnboardingRecovery(event, error, introduction) {
	const md = Format.createMarkdown();
	if (introduction) md.addBlockquote(createQuoteMarkdown(introduction.split("\n")));
	md.addText("宋玉停住脚步：“先核对进度，别急着重复操作。”").addNewline();
	const reason = error instanceof Error ? error.message : "教学进度暂时无法确认，请稍后继续。";
	md.addText(reason);
	await sendTeachingMessage(event, FormatGui({
		isPrivate: isPrivateEvent(event),
		bid: event.UserId,
		title: "宋玉 · 操作暂未确认",
		content: md,
		footer: [[{
			label: "核对当前进度 · /继续引导",
			command: "/继续引导"
		}], [{
			label: "暂离教学 · /退出引导",
			command: "/退出引导"
		}]],
		bar: false
	}), [
		"宋玉 · 操作暂未确认",
		...introduction ? [introduction] : [],
		"宋玉停住脚步：“先核对进度，别急着重复操作。”",
		reason,
		"可选指令：",
		"核对当前进度 · /继续引导",
		"暂离教学 · /退出引导"
	]);
}
async function startOnboardingAfterPrologue(event, introduction) {
	const result = await requestRobotBusiness(event, "onboarding.view", {}, parseOnboarding);
	if (result.success && result.branch === "business") {
		if (result.data.status === "active" || result.data.status === "soft") {
			await showOnboarding(event, result.data, introduction);
			return true;
		}
		return false;
	}
	if (result.middleware.replies.length) {
		await showOnboardingRecovery(event, /* @__PURE__ */ new Error("教学入口暂被系统检查拦截。请先处理下方提示，再继续引导。"), introduction);
		for (const reply of result.middleware.replies) await sendMiddlewareReply(event, reply);
	}
	return true;
}

//#endregion
export { listenOnboarding, onboardingContent, sendTeachingMessage, showOnboarding, showOnboardingRecovery, startOnboardingAfterPrologue };