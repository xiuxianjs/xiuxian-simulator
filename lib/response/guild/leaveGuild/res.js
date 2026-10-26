import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildLeave } from "../../../api/bot/guild-leave-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/leaveGuild/res.ts
/**
* 退出宗门指令响应处理
* 指令格式: /退出宗门
* 退出当前宗门，需二次确认
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "guild.leave", {}, parseRobotGuildLeave, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		}).catch(async (error) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(error instanceof Error ? error.message : "退出宗门失败")
			}));
			return { handled: true };
		});
		if (loaded.handled) return;
		const result = loaded.data;
		if (result.outcome === "confirmation_required") {
			const md = Format.createMarkdown();
			md.addBold("⚠️ 退出宗门确认");
			md.addNewline();
			md.addText(`您确定要退出【${result.guildName}】吗？`);
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("退出后24小时内无法使用宗门相关功能");
			md.addNewline();
			md.addText("所有待审核的申请将自动撤回");
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("请在60秒内再次发送 /退出宗门 以确认");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "确认退出",
					command: "/退出宗门"
				}, {
					label: "取消",
					command: "/取消退出宗门"
				}]
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold("✅ 退出成功");
		md.addNewline();
		md.addText(result.message);
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
	} catch (error) {
		logger.error("退出宗门指令处理失败:", error);
		const md = Format.createMarkdown();
		md.addBold("宗门错误");
		md.addText("退出宗门失败，请稍后再试或联系运营。");
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