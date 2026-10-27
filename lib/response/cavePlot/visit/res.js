import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { parseCavePage } from "../pagination.js";
import { sendVisitedCavePlotPage } from "../render.js";
import { parseBackendCaveVisit } from "../../../api/bot/cave-visit-queries.js";
import { logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/cavePlot/visit/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave.visit", {
		...reply,
		title: reply.title || "查看灵田"
	}), "footer"));
	try {
		const [, next] = useEvent();
		const { text, page } = parseCavePage(e.MessageText ?? "");
		const target = await resolveRobotTarget(text, mention);
		const response = await runRobotBusiness(e, "cave.visit", { target }, (value) => {
			const data = parseBackendCaveVisit(value);
			if (target && "uid" in target && data.ownerUid !== target.uid) throw new Error("访问回执目标不匹配");
			return data;
		}, next, failure);
		if (response.handled) return;
		const overview = response.data;
		const footer = [{
			label: "查看信息",
			command: `/查看信息 ${overview.ownerUid}`
		}, {
			label: "返回灵田",
			command: "/我的灵田"
		}];
		sendVisitedCavePlotPage({
			title: "查看灵田",
			bid,
			isPrivate,
			message,
			overview,
			page,
			footer
		});
	} catch (error) {
		logger.error("查看灵田失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "获取目标灵田失败，请稍后重试。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };