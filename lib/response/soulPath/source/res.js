import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withoutSoulConfirmationActions } from "../../soulPathRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseSoulPathState } from "../../../api/bot/soul-path.js";
import { addSoulQuote, sendSoulGui } from "../shared.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/soulPath/source/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	const [, parentNext] = useEvent();
	const sendFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("soul-path.state", withoutSoulConfirmationActions({
		...reply,
		title: reply.title || "神魂材料来源"
	})), "footer"));
	const panel = await runRobotBusiness(e, "soul-path.state", {}, parseSoulPathState, parentNext, sendFailure).catch(async (error) => {
		logger.error("[元婴神魂] 面板加载失败:", error);
		await sendFailure({
			title: "",
			heading: "",
			text: "神魂查询结果未获完整确认，请核对当前状态，稍后重新查看；不据此判断道途或材料已消失。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (panel.handled) return;
	md.addBold("持有材料");
	md.addNewline();
	md.addText(panel.data.panel.materials.map((material) => `${material.name}×${material.quantity}`).join(" · "));
	md.addNewline();
	md.addNewline();
	md.addBold("获取途径");
	md.addNewline();
	for (const line of panel.data.panel.materialSourceLines) addSoulQuote(md, line);
	md.addBold("温养规则");
	md.addNewline();
	for (const line of panel.data.panel.nurtureRuleLines.slice(0, -1)) addSoulQuote(md, line);
	md.addNewline();
	addSoulQuote(md, panel.data.panel.nurtureRuleLines.at(-1) ?? "");
	await message.send(sendSoulGui(e, "神魂材料来源", md, [
		{
			label: "元婴神魂",
			command: "/元婴神魂"
		},
		{
			label: "元婴道途",
			command: "/元婴道途"
		},
		{
			label: "万宝楼",
			command: "/商店 万宝楼"
		},
		{
			label: "神奇商店",
			command: "/商店 神奇"
		},
		{
			label: "材料背包",
			command: "/储物袋 材料 其它"
		}
	]));
});

//#endregion
export { res_default as default };