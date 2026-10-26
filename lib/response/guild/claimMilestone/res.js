import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildMilestoneClaim } from "../../../api/bot/guild-claims-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/claimMilestone/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const title = "";
	const footer = void 0;
	const msg = e.MessageText?.trim() || "";
	const args = { milestoneArg: (msg.match(/领取宗门日活奖励\s+(\d+)/) ?? msg.match(/领取宗门周活奖励\s+(\d+)/))?.[1] ?? "" };
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title,
		content: Format.createMarkdown().addText(text),
		footer
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.milestone-claim", args, (value) => parseRobotGuildMilestoneClaim(value, Number(args.milestoneArg)), next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		if (!args.milestoneArg) {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title,
				content: Format.createMarkdown().addText(loaded.data.message),
				footer: [{
					label: "查看奖励编号与条件",
					command: msg.includes("周活") ? "/宗门周常" : "/宗门日常"
				}]
			}));
			return;
		}
		send(loaded.data.message);
	} catch (error) {
		logger.error("宗门领奖指令失败:", error);
		await send("领取失败，请稍后再试。");
	}
});

//#endregion
export { res_default as default };