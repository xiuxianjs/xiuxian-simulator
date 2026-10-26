import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildWeekly } from "../../../api/bot/guild-daily-robot-query.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/weekly/res.ts
/**
* 宗门周常指令
* 指令格式：/宗门周常
* 展示宗门周常任务进度和周活跃度里程碑奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "guild.weekly", {}, parseRobotGuildWeekly, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
		if (loaded.handled) return;
		const { guildName, contributionPoints, weeklyActivity, weeklyActivityMax, stipendThreshold, stipendPreviewAmount, stipendBaseAmount, stipendGuildLevel, stipendLevelMultiplier, stipendActivityMultiplier, weeklyTasks, claimAllAvailable, milestones } = loaded.data.data;
		const md = Format.createMarkdown();
		md.addText(`贡献点：${contributionPoints}`);
		md.addNewline();
		md.addText(`活跃度：${weeklyActivity}/${weeklyActivityMax}（俸禄需${stipendThreshold}）`);
		md.addNewline();
		md.addText(`预计俸禄：${stipendPreviewAmount}灵石`);
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`基础${stipendBaseAmount} × 宗门${stipendGuildLevel}级${stipendLevelMultiplier.toFixed(1)}倍 × 活跃${stipendActivityMultiplier.toFixed(1)}倍`));
		for (const task of weeklyTasks) {
			md.addText(`${task.completed ? "◆" : "◇"} ${task.label}（${task.progress}/${task.target}${task.unit}）+${task.activityReward}活跃`);
			if (task.completed) md.addText(`  奖励：${task.bonusText}`);
			md.addNewline();
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
					command: `/领取宗门周活奖励 ${m.id}`
				}]);
				else md.addNewline();
			}
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `【${guildName}】宗门周常`,
			header: [{
				label: "宗门日常",
				command: "/宗门日常"
			}, {
				label: "宗门周常",
				selected: true,
				command: "/宗门周常"
			}],
			content: md,
			footer: [
				...claimAllAvailable ? [{
					label: "一键领取",
					command: "/一键领取宗门周活奖励"
				}] : [],
				{
					label: "签到",
					command: "/宗门签到"
				},
				{
					label: "采矿",
					command: "/宗门采矿"
				},
				{
					label: "商店",
					command: "/宗门商店"
				},
				{
					label: "俸禄",
					command: "/领取宗门俸禄"
				}
			]
		}));
	} catch (error) {
		logger.error("宗门周常指令处理失败:", error);
		const md = Format.createMarkdown();
		md.addText(error?.message ?? "获取宗门周常失败，请稍后再试或联系运营。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门周常",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };