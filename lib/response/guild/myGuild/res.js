import { parseGuildHome } from "../../../api/bot/guild-home-query.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { buildGuildHomePage } from "./view.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/myGuild/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").trim().match(/^[!！/#＃]?(?:我的宗门|查看势力)(?:\s+(活动|资料|管理))?$/);
	try {
		const loaded = await runRobotBusiness(e, "guild.home", {}, parseGuildHome, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "宗门",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const data = loaded.data;
		if (!data.hasGuild) {
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "宗门",
				content: createQuoteMarkdown(["【寻觅宗门】", "尚未加入宗门，先寻访同道。"]),
				footer: [
					{
						label: "宗门列表",
						command: "/宗门列表"
					},
					{
						label: "我的申请",
						command: "/我的申请"
					},
					...data.access.canCreateGuild ? [{
						label: "创建宗门",
						command: "/创建宗门"
					}] : []
				]
			}));
			return;
		}
		const page = buildGuildHomePage(data, match?.[1]);
		message.send(FormatGui({
			isPrivate,
			bid,
			...page
		}));
	} catch (error) {
		logger.error("我的宗门指令处理失败:", error);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "获取宗门信息失败")
		}));
	}
});

//#endregion
export { res_default as default };