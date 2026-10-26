import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildContentAction } from "../../../api/bot/guild-content-action-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/setNotice/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?设置宗门公告\s+(.+)$/);
	const args = { content: match ? match[1].trim() : null };
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.notice-set", args, (value) => parseRobotGuildContentAction(value, "notice-set"), next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		if (loaded.data.outcome === "usage") {
			const md = Format.createMarkdown();
			md.addText("使用方法：设置宗门公告 内容");
			md.addNewline();
			md.addText("说明：公告内容不能超过50字");
			md.addNewline();
			md.addText("权限：副宗主及以上职位");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		send(loaded.data.message);
	} catch (error) {
		await send(error instanceof Error ? error.message : "设置宗门公告失败");
	}
});

//#endregion
export { res_default as default };