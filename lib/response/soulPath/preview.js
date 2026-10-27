import { parseSoulChoosePreview } from "../../api/bot/soul-path-choose.js";
import { parseSoulActionPreview } from "../../api/bot/soul-path-action.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { sendMiddlewareReply } from "../middlewareReply.js";
import { withoutSoulConfirmationActions } from "../soulPathRecovery.js";
import { withBusinessRecovery } from "../businessRecovery.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { addSoulQuote, getCommandArgument, isSoulConfirmationToken, sendSoulGui } from "./shared.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/soulPath/preview.ts
const createSoulPreviewHandler = (action, command) => onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, parentNext] = useEvent();
	const input = getCommandArgument(e.MessageText, command);
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery(`soul-path.${action}-preview`, withoutSoulConfirmationActions({
		...reply,
		title: reply.title || `${command}·确认`
	})), "footer"));
	const normalized = (e.MessageText ?? "").trim().replace(/^[!！/#＃]/, "").trim();
	if ((action === "advance" || action === "reroll") && normalized !== command) {
		await failure({
			title: "",
			heading: "",
			text: `参数错误：/${command} 不附道途名、确认文字或其他参数，请先核对当前状态。`,
			buttons: [],
			advice: []
		});
		return;
	}
	const sendPreview = async (result) => {
		const md = Format.createMarkdown();
		for (const [index, line] of result.message.split("\n").entries()) if (index === 0) {
			md.addBold(line);
			md.addNewline();
		} else addSoulQuote(md, line);
		md.addNewline();
		addSoulQuote(md, "尚未执行 · 确认后生效");
		await message.send(sendSoulGui(e, `${command}·确认`, md, [
			{
				label: "确认执行",
				command: `/确认神魂 ${action === "choose" ? `choose:${result.token}` : result.token}`
			},
			{
				label: "返回道途",
				command: "/元婴道途"
			},
			{
				label: "材料来源",
				command: "/神魂材料来源"
			}
		]));
	};
	const response = await runRobotBusiness(e, `soul-path.${action}-preview`, { input }, (value) => {
		const data = action === "choose" ? parseSoulChoosePreview(value) : parseSoulActionPreview(value);
		if (!isSoulConfirmationToken(data.token) || !data.message.trim()) throw new Error("神魂预览响应不完整");
		return data;
	}, parentNext, failure).catch(async (error) => {
		logger.error("[神魂预览] 失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "神魂操作预览未获完整确认，请先核对当前状态与原反馈。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	await sendPreview(response.data);
});

//#endregion
export { createSoulPreviewHandler };