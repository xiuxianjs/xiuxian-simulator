import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildList } from "../../../api/bot/guild-directory-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/guildList/res.ts
/**
* 宗门列表指令响应处理
* 指令格式: /宗门列表
* 显示所有现有宗门信息
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	try {
		const match = (e.MessageText ?? "").match(/^[!！/#＃]?宗门列表(?:\s+(\d+))?$/);
		let page = match?.[1] ? parseInt(match[1], 10) : 1;
		if (page < 1 || !Number.isInteger(page)) page = 1;
		const loaded = await runRobotBusiness(e, "guild.list", { page }, parseRobotGuildList, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "宗门列表",
				content: reply.quote ? createQuoteMarkdown([reply.text]) : Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const { result, canCreateOrApplyGuild, redirected } = loaded.data;
		if (!result) return;
		if (redirected) {
			const subMd = Format.createMarkdown();
			subMd.addBlockquote(Format.createMarkdown().addText(`页码超出范围，已自动跳转到最后一页（第 ${result.currentPage} 页）`));
			message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "宗门列表",
				header: canCreateOrApplyGuild ? [{
					label: "创建宗门",
					command: "/创建宗门"
				}] : [],
				content: subMd
			}));
			handleGuildListDisplay(result, message, bid, e.isPrivate ?? false, canCreateOrApplyGuild);
			return;
		}
		handleGuildListDisplay(result, message, bid, e.isPrivate ?? false, canCreateOrApplyGuild);
	} catch (error) {
		logger.error("[宗门列表] 处理错误:", error);
		const errMd = Format.createMarkdown();
		errMd.addBlockquote(Format.createMarkdown().addText("获取宗门列表失败，请稍后重试"));
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "宗门列表",
			content: errMd
		}));
	}
});
function handleGuildListDisplay(result, message, bid, isPrivate, canCreateOrApply) {
	try {
		if (result.total === 0) {
			const subMd = Format.createMarkdown();
			subMd.addBlockquote(Format.createMarkdown().addText(canCreateOrApply ? "当前还没有任何宗门创建，您可以使用 /创建宗门 指令创建一个新宗门" : "当前还没有任何宗门创建"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "暂无宗门",
				header: canCreateOrApply ? [{
					label: "创建宗门",
					command: "/创建宗门"
				}] : [],
				content: subMd
			}));
			return;
		}
		const contentMd = Format.createMarkdown();
		result.guilds.forEach((guild) => {
			const levelInfo = guild.levelName ? `${guild.levelName}` : "";
			const titles = guild.titles?.filter((t) => t?.trim()).map((t) => t.trim()) ?? [];
			const lines = [
				`【${guild.id}】${guild.name}-${levelInfo}-${guild.memberCount}人`,
				`称号：${titles.length > 0 ? titles.join("、") : "无"}`,
				`简介：${guild.intro}`
			];
			if (guild.minRealmName) lines.push(`入宗要求：${guild.minRealmName}及以上`);
			contentMd.addBlockquote(createQuoteMarkdown(lines, canCreateOrApply ? [{
				label: "加入",
				command: `/加入宗门 ${guild.id}`
			}] : []));
			contentMd.addNewline();
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门列表",
			header: [...canCreateOrApply ? [{
				label: "创建宗门",
				command: "/创建宗门"
			}] : [], {
				label: "我的申请",
				command: "/我的申请"
			}],
			content: contentMd,
			nav: {
				current: result.currentPage,
				total: result.totalPages,
				count: result.total,
				command: "/宗门列表 {page}"
			}
		}));
	} catch (error) {
		logger.error("[宗门列表显示] 处理错误:", error);
		const errMd = Format.createMarkdown();
		errMd.addBlockquote(Format.createMarkdown().addText("显示宗门列表失败，请稍后重试"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门列表",
			content: errMd
		}));
	}
}

//#endregion
export { res_default as default };