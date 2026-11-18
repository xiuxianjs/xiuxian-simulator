import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildApply } from "../../../api/bot/guild-membership-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/joinGuild/res.ts
/**
* 加入宗门指令响应处理
* 指令格式: /加入宗门 宗门ID
* 申请加入指定ID的宗门
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const match = (e.MessageText || "").match(/^[!！/#＃]?加入宗门\s*(\d+)?$/);
		const sendFailure = async (text) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(text)
			}));
		};
		const guildId = match?.[1] ? parseInt(match[1], 10) : null;
		const loaded = await runRobotBusiness(e, "guild.apply", { guildId }, parseRobotGuildApply, next, async (reply) => {
			await sendFailure(reply.text);
		}).catch(async (error) => {
			await sendFailure(error instanceof Error ? error.message : "申请加入宗门失败");
			return { handled: true };
		});
		if (loaded.handled) return;
		if (loaded.data.outcome === "usage") {
			const md = Format.createMarkdown();
			md.addBold("参数错误");
			md.addNewline();
			md.addText("请指定要加入的宗门ID");
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("**使用格式：**");
			md.addNewline();
			md.addText("/加入宗门 ID");
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("例如：/加入宗门 1");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "查看宗门列表",
					command: "/宗门列表"
				}]
			}));
			return;
		}
		const result = loaded.data;
		{
			const md = Format.createMarkdown();
			md.addBold("✅ 申请成功");
			md.addNewline();
			md.addText(result.data.message);
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("**申请信息：**");
			md.addNewline();
			md.addText(`宗门：${result.data.guildName}`);
			md.addNewline();
			md.addText(`等级：${result.data.levelName}`);
			md.addNewline();
			md.addText(`成员数：${result.data.memberCount}人`);
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("请耐心等待宗门管理审核");
			md.addNewline();
			md.addText("您可以随时查看申请状态");
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "我的申请",
					command: "/我的申请"
				}, {
					label: "宗门列表",
					command: "/宗门列表"
				}]
			}));
		}
	} catch (error) {
		logger.error("加入宗门指令处理失败:", error);
		const md = Format.createMarkdown();
		md.addText("申请加入宗门失败，请稍后再试或联系运营。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };