import { parseRobotGuildContent } from "../../../api/bot/guild-content-robot-query.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/viewNotice/res.ts
/**
* 查看宗门公告
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.notice", {}, parseRobotGuildContent, next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		const result = { data: loaded.data };
		const md = Format.createMarkdown();
		md.addBold(`【${result.data.guildName}】宗门公告`);
		md.addNewline();
		md.addButton(markdownButtonLabel("返回"), { data: "/我的宗门" });
		md.addNewline();
		md.addText(result.data.notice ?? "暂无公告");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch (error) {
		await send(error instanceof Error ? error.message : "查询公告失败");
	}
});

//#endregion
export { res_default as default };