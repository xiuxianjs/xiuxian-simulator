import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { caveFormationKeyword, parseBackendCaveFormationActivation } from "../../../api/bot/cave-formation-actions.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/caveFormation/activate/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const keyword = caveFormationKeyword(e.MessageText ?? "", "activate");
	const md = Format.createMarkdown();
	const footer = [{
		label: "洞府阵法",
		command: "/洞府阵法"
	}, {
		label: "万宝楼",
		command: "/商店 万宝楼"
	}];
	const renderFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave-formations.activate", {
		...reply,
		title: reply.title || "激活阵盘"
	}), "footer"));
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "cave-formations.activate", { keyword }, parseBackendCaveFormationActivation, next, renderFailure);
		if (response.handled) return;
		const result = response.data;
		const messageText = result.outcome === "refreshed" ? `你重新布下【${result.formation.formationName}】，持续时间已刷新为 ${result.durationHours} 小时。` : result.outcome === "replaced" ? `你以【${result.formation.formationName}】替换了同类阵法【${result.replacedFormationName}】，新阵持续 ${result.durationHours} 小时。` : `你成功布下【${result.formation.formationName}】，持续 ${result.durationHours} 小时。`;
		md.addText(messageText);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "激活成功",
			content: md,
			footer
		}));
	} catch (error) {
		logger.error("[激活阵盘] 结果未获完整确认", error);
		await renderFailure({
			title: "",
			heading: "",
			text: "激活阵盘结果未获完整确认，请先核对当前阵法、库存与原回执。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };