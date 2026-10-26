import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildMining } from "../../../api/bot/guild-activity-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/mining/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.mining", {}, parseRobotGuildMining, next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		if (loaded.data.outcome === "in_progress") {
			const md = Format.createMarkdown().addText(loaded.data.message);
			appendMiddlewareAdvice(md, [{
				command: "/宗门日常",
				description: "采矿尚未达到本次结算时机，按原提示的剩余时间等待，查看日常面板中的采矿状态；重复请求不会加快产出，不重置或重复开始"
			}]);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		send(loaded.data.message);
	} catch (error) {
		await send(error instanceof Error ? error.message : "挖矿失败");
	}
});

//#endregion
export { res_default as default };