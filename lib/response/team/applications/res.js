import { parseBackendTeamPendingApplications } from "../../../api/bot/queries.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { teamRecoveryTips } from "../../teamRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/applications/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?(处理)?队伍申请$/;
	const messageText = e.MessageText || "";
	if (!regex.test(messageText)) return;
	const back = [{
		label: "我的队伍",
		command: "/我的队伍"
	}];
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.applications", {}, (value) => {
			if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return {
				code: "LOAD_FAILED",
				data: { message: value.error }
			};
			return {
				code: "OK",
				data: parseBackendTeamPendingApplications(value)
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("查询队伍申请失败:", error);
		result = {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
	if (result.code !== "OK") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.applications", result.data.message));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: back
		}));
		return;
	}
	if (result.data.applications.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无入队申请");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "队伍申请",
			content: md,
			footer: back
		}));
		return;
	}
	const md = Format.createMarkdown();
	for (const app of result.data.applications) {
		md.addText(`【${app.userId}】${app.userName}`);
		addOptions(md, [{
			label: "同意",
			command: `/队伍同意 ${app.id}`
		}, {
			label: "拒绝",
			command: `/队伍拒绝 ${app.id}`
		}]);
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `【${result.data.leaderName}】的队伍`,
		content: md,
		footer: back
	}));
});

//#endregion
export { res_default as default };