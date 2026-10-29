import { formatGameDate } from "../../../utils/gameTime.js";
import { parseRobotGuildEssences } from "../../../api/bot/guild-content-robot-query.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { createGuildEssenceButtons } from "../../../markdown/buttons/guild.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/viewEssences/res.ts
/**
* 查看宗门精华
* 指令格式: /宗门精华 [页码]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText || "").match(/^[!！/#＃]?宗门精华(?:\s+(\d+))?$/);
	let page = match?.[1] ? parseInt(match[1], 10) : 1;
	if (page < 1 || !Number.isInteger(page)) page = 1;
	const send = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "guild.essences", { page }, parseRobotGuildEssences, next, async (reply) => {
			await send(reply.text);
		});
		if (loaded.handled) return;
		handleEssenceDisplay(loaded.data, message, bid, Number(e.uid), isPrivate);
	} catch (error) {
		await send(error instanceof Error ? error.message : "查询精华失败");
	}
});
function handleEssenceDisplay(result, message, bid, _uid, isPrivate = false) {
	try {
		if (!result.success) {
			const md = Format.createMarkdown();
			md.addText(result.message ?? "查询失败");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (!result.essences || result.essences.length === 0) {
			const md = Format.createMarkdown();
			md.addBold(`【${result.guildName}】宗门精华`);
			md.addNewline();
			md.addButton(markdownButtonLabel("返回"), { data: "/我的宗门" });
			md.addText(" ");
			md.addButton(markdownButtonLabel("添加"), { data: "/添加精华" });
			md.addNewline();
			md.addText("暂无精华内容");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold(`【${result.guildName}】宗门精华`);
		md.addNewline();
		md.addText(`第 ${result.currentPage}/${result.totalPages} 页，共 ${result.total} 条精华`);
		md.addNewline();
		md.addNewline();
		result.essences.forEach((essence, index) => {
			const date = formatGameDate(essence.createdAt);
			md.addText(`【${essence.id}】 ${essence.content}`);
			md.addNewline();
			md.addText(`  创建者：${essence.creatorName} | ${date}`);
			addOptions(md, [{
				label: "移除",
				command: `/移除精华 ${essence.id}`
			}]);
			if (index < result.essences.length - 1) md.addNewline();
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: createGuildEssenceButtons(result.currentPage, result.totalPages)
		}));
	} catch (error) {
		logger.error("[宗门精华] 显示错误:", error);
		const md = Format.createMarkdown();
		md.addText("显示宗门精华失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
}

//#endregion
export { res_default as default };