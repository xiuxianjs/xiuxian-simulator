import { parseRobotGuildStipend } from "../../../api/bot/guild-claims-robot-query.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/stipend/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const title = "";
	const footer = void 0;
	const args = {};
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title,
		content: Format.createMarkdown().addText(text),
		footer
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.stipend-claim", args, parseRobotGuildStipend, next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		send(loaded.data.message);
	} catch (error) {
		logger.error("宗门领奖指令失败:", error);
		await send(error instanceof Error ? error.message : "领取奖励失败");
	}
});

//#endregion
export { res_default as default };