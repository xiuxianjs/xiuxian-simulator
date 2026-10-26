import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildMilestonesClaimAll } from "../../../api/bot/guild-claims-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/claimAllMilestones/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msg = e.MessageText?.trim() || "";
	const isDaily = /^[!！/#＃]?(?:领取全部|一键领取)宗门日活奖励$/.test(msg);
	const isWeekly = /^[!！/#＃]?(?:领取全部|一键领取)宗门周活奖励$/.test(msg);
	if (!isDaily && !isWeekly) return;
	const args = { type: isDaily ? "daily_activity" : "weekly_activity" };
	const title = isDaily ? "宗门日常" : "宗门周常";
	const footer = [{
		label: "返回",
		command: isDaily ? "/宗门日常" : "/宗门周常"
	}];
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title,
		content: Format.createMarkdown().addText(text),
		footer
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.milestone-claim-all", args, parseRobotGuildMilestonesClaimAll, next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		if (loaded.data.partial) {
			const md = Format.createMarkdown().addText(loaded.data.message);
			appendMiddlewareAdvice(md, [{
				command: isDaily ? "/宗门日常" : "/宗门周常",
				description: "已列出的奖励已经领取，后续失败不代表整批回滚；先核对原回执及当前剩余可领取项，不自动重新领取整批奖励"
			}]);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title,
				content: md,
				footer
			}));
			return;
		}
		send(loaded.data.message);
	} catch (error) {
		logger.error("宗门领奖指令失败:", error);
		await send(error instanceof Error ? error.message : "领取奖励失败");
	}
});

//#endregion
export { res_default as default };