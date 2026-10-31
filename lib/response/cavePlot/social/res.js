import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { parseBackendCaveCommand, sendCaveCommandFallback } from "../../../api/bot/cave-command.js";
import { caveSocialCommand } from "../../../api/bot/cave-robot-command.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { cavePageForPlot } from "../pagination.js";
import { sendVisitedCavePlotPage } from "../render.js";
import { logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/cavePlot/social/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const { operation, args } = await caveSocialCommand(e.MessageText ?? "", mention);
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, operation, args, parseBackendCaveCommand, next, adviceRenderer((reply) => {
			if (!reply.advice.length) {
				sendCaveCommandFallback({
					message: reply.text,
					snapshotError: null
				}, bid, isPrivate, message, reply.title);
				return Promise.resolve();
			}
			return sendMiddlewareReply(e, {
				...reply,
				buttons: [...reply.buttons, ...Number.isSafeInteger(Number(args.ownerUid)) && Number(args.ownerUid) > 0 ? [{
					label: "查看原目标灵田",
					command: `/查看灵田 ${args.ownerUid}`
				}] : []]
			});
		}));
		if (response.handled) return;
		const result = response.data;
		if (result.snapshotError) {
			sendCaveCommandFallback(result, bid, isPrivate, message, "灵田互动");
			return;
		}
		const title = operation === "cave.steal" ? "偷药" : "协作灵田";
		if (result.visit) {
			const targetUid = args.ownerUid !== null ? Number(args.ownerUid) : void 0;
			sendVisitedCavePlotPage({
				title,
				bid,
				isPrivate,
				message,
				overview: result.visit,
				page: cavePageForPlot(result.visit.plots.filter((plot) => plot.plotState === "cultivated"), Number(args.plotIndex)),
				leadText: result.message,
				treasureEffects: result.treasureEffects,
				footer: [{
					label: "查看信息",
					command: `/查看信息 ${result.ownerUid ?? targetUid}`
				}, {
					label: "我的灵田",
					command: "/灵田"
				}]
			});
			return;
		}
		sendCaveCommandFallback(result, bid, isPrivate, message, title);
	} catch (error) {
		logger.error("灵田互动失败:", error);
		sendCaveCommandFallback({
			message: "灵田互动失败，请稍后重试。",
			snapshotError: null
		}, bid, isPrivate, message, "灵田互动");
	}
});

//#endregion
export { res_default as default };