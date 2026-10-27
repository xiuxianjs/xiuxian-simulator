import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { ownPlotActions } from "../capabilities.js";
import { parseCavePage } from "../pagination.js";
import { sendSelfCavePlotPage } from "../render.js";
import { parseBackendCaveView } from "../../../api/bot/cave-command.js";
import { logger, onResponse, useEvent } from "alemonjs";

//#region src/response/cavePlot/info/res.ts
function plotPresentation(plot) {
	return {
		plotIndex: plot.plotIndex,
		plotState: plot.plotState,
		title: plot.title,
		detail: plot.detail,
		actionLabel: ownPlotActions(plot)[0]?.label,
		actionCommand: ownPlotActions(plot)[0]?.command,
		actions: ownPlotActions(plot)
	};
}
function presentBackendCavePlots(plots) {
	return plots.map(plotPresentation);
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const { text, page } = parseCavePage(e.MessageText ?? "");
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave.view", {
		...reply,
		title: reply.title || "洞府灵田"
	}), "footer"));
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "cave.view", {}, parseBackendCaveView, next, failure);
		if (response.handled) return;
		const { overview } = response.data;
		if (!overview) throw new Error("洞府概览缺失");
		sendSelfCavePlotPage({
			title: "我的灵田",
			bid,
			isPrivate,
			message,
			page,
			showOperations: /(?:我的灵田|灵田|我的洞府|洞府)\s+操作\s*$/.test(text),
			showManagement: /(?:我的灵田|灵田|我的洞府|洞府)\s+经营\s*$/.test(text),
			selectedPlotIndex: (() => {
				const match = text.match(/\s+地块\s+(\d+)\s*$/);
				return match ? Number(match[1]) : void 0;
			})(),
			plots: presentBackendCavePlots(overview.plots),
			cultivationCostText: overview.cultivationCostText,
			stasisFormation: overview.stasisFormation ?? void 0
		});
	} catch (error) {
		logger.error("洞府灵田查询失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "获取洞府灵田失败，请稍后重试。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default, presentBackendCavePlots };