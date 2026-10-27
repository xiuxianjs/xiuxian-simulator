import { parseGuildLogs } from "../../../api/bot/queries.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { createGuildLogButtons } from "../../../markdown/buttons/guild.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/viewLogs/res.ts
/**
* 宗门日志指令
* 指令格式：/宗门日志 [页数]
* 展示当前玩家所在宗门的日志列表，支持分页查看
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText ?? "").match(/^[!！/#＃]?宗门日志(?:\s*(\d+))?$/);
	let page = match?.[1] ? parseInt(match[1], 10) : 1;
	if (page < 1 || !Number.isInteger(page)) page = 1;
	const loaded = await runRobotBusiness(e, "guild.logs", { page }, parseGuildLogs, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(reply.text)
		}));
	});
	if (loaded.handled) return;
	const { guildName, logs, total, totalPages, page: actualPage } = loaded.data;
	const md = Format.createMarkdown();
	md.addBold(`【${guildName}】宗门日志`);
	md.addNewline();
	if (total === 0 || !logs || logs.length === 0) {
		md.addText("暂无日志");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	logs.forEach((item, index) => {
		md.addText(item.content);
		md.addNewline();
		md.addText(`时间：${item.formattedTime}`);
		if (index < logs.length - 1) {
			md.addNewline();
			md.addNewline();
		}
	});
	md.addNewline();
	md.addText(`第 ${actualPage}/${totalPages} 页，共 ${total} 条日志`);
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: createGuildLogButtons(actualPage, totalPages)
	}));
});

//#endregion
export { res_default as default };