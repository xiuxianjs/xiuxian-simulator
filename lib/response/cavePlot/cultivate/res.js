import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { ownCaveInputError } from "../input.js";
import { cavePageForPlot } from "../pagination.js";
import { sendSelfCavePlotPage } from "../render.js";
import { parseBackendCaveCommand, sendCaveCommandFallback } from "../../../api/bot/cave-command.js";
import { caveCultivateArguments } from "../../../api/bot/cave-robot-command.js";
import { presentBackendCavePlots } from "../info/res.js";
import { logger, onResponse, useEvent } from "alemonjs";

//#region src/response/cavePlot/cultivate/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave.cultivate", {
		...reply,
		title: reply.title || "开垦灵田"
	}), "footer"));
	const fallback = (result) => sendCaveCommandFallback(result, bid, isPrivate, message, "开垦灵田", withBusinessRecovery("cave.cultivate", {
		title: "",
		heading: "",
		text: result.message + "\n" + (result.snapshotError ?? ""),
		buttons: [],
		advice: []
	}).advice);
	const inputError = ownCaveInputError("cultivate", e.MessageText ?? "");
	if (inputError) {
		await failure({
			title: "",
			heading: "",
			text: inputError,
			buttons: [],
			advice: []
		});
		return;
	}
	try {
		const [, next] = useEvent();
		const args = caveCultivateArguments(e.MessageText?.trim() ?? "");
		const response = await runRobotBusiness(e, "cave.cultivate", args, parseBackendCaveCommand, next, failure);
		if (response.handled) return;
		const result = response.data;
		const overview = result.overview;
		if (!overview || result.snapshotError) {
			await fallback({
				...result,
				snapshotError: result.snapshotError?.trim() ? result.snapshotError : "灵田状态未获完整确认，请先查看当前状态，不重复原操作。"
			});
			return;
		}
		sendSelfCavePlotPage({
			title: "开垦灵田",
			bid,
			isPrivate,
			message,
			plots: presentBackendCavePlots(overview.plots),
			cultivationCostText: overview.cultivationCostText,
			leadText: result.message,
			page: cavePageForPlot(overview.plots.filter((plot) => plot.plotState !== "locked"), Number(args.plotIndex))
		});
	} catch (error) {
		logger.error("开垦灵田失败:", error);
		await fallback({
			message: "开垦灵田结果未获完整确认，请先核对当前灵田与原回执。",
			snapshotError: null
		});
	}
});

//#endregion
export { res_default as default };