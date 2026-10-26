import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildDaily } from "../../../api/bot/guild-daily-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/daily/res.ts
/**
* 宗门日常指令
* 指令格式：/宗门日常 或 /宗门任务
* 展示宗门日常任务进度和日活跃度里程碑奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "guild.daily", {}, parseRobotGuildDaily, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
		if (loaded.handled) return;
		const { guildName, dailyActivity, dailyActivityMax, contributionPoints, dailyTasks, claimAllAvailable, milestones } = loaded.data.data;
		const md = Format.createMarkdown();
		md.addText(`贡献点：${contributionPoints}`);
		md.addNewline();
		md.addText(`活跃度：${dailyActivity}/${dailyActivityMax}`);
		md.addNewline();
		const taskCommands = {
			checkin: "/宗门签到",
			mining: "/宗门采矿",
			exchange: "",
			worship: "/祭祀祖师",
			storyline: "/宗门主线"
		};
		for (const task of dailyTasks) {
			md.addText(task.line);
			const command = taskCommands[task.key];
			if (task.actionAvailable && command) addOptions(md, [{
				label: task.actionLabel,
				command
			}]);
			else md.addNewline();
		}
		if (milestones.length > 0) {
			md.addNewline();
			md.addText("【活跃度奖励】");
			md.addNewline();
			for (const m of milestones) {
				const status = m.claimed ? "✅" : m.canClaim ? "🔓" : "🔒";
				md.addText(`${status}${m.threshold}点→${m.description}`);
				if (m.canClaim) addOptions(md, [{
					label: "领取",
					command: `/领取宗门日活奖励 ${m.id}`
				}]);
				else md.addNewline();
			}
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `【${guildName}】宗门日常`,
			header: [{
				label: "宗门日常",
				selected: true,
				command: "/宗门日常"
			}, {
				label: "宗门周常",
				command: "/宗门周常"
			}],
			content: md,
			footer: [
				...claimAllAvailable ? [{
					label: "一键领取",
					command: "/一键领取宗门日活奖励"
				}] : [],
				{
					label: "商店",
					command: "/宗门商店"
				},
				{
					label: "俸禄",
					command: "/领取宗门俸禄"
				},
				{
					label: "宗门首页",
					command: "/我的宗门"
				}
			]
		}));
	} catch (error) {
		logger.error("宗门日常指令处理失败:", error);
		const md = Format.createMarkdown();
		md.addText(error?.message ?? "获取宗门日常失败，请稍后再试或联系运营。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门日常",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };