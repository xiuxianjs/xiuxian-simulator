import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseBackendNewcomerLoginView } from "../../../api/bot/newcomer-login-queries.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/activity/newcomerLogin/res.ts
/** 新人狂欢入口仅解析页码，并渲染 Go 返回的七日展示投影。 */
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const dayMatch = e.MessageText.trim().match(/(?:初入仙途|新人狂欢)\s+(\d+)/);
		const targetDay = dayMatch ? parseInt(dayMatch[1], 10) : 0;
		const loaded = await runRobotBusiness(e, "newcomer-activity.overview", {}, parseBackendNewcomerLoginView, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const view = loaded.data;
		const md = Format.createMarkdown();
		if (targetDay > 0) renderDayDetail(targetDay, view, md);
		else renderOverview(view, md);
		const footer = view.signInCommand ? [{
			label: "修行打卡",
			command: view.signInCommand
		}] : [];
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "初入仙途",
			...targetDay > 0 ? { header: [{
				label: "返回",
				command: "/初入仙途"
			}] } : {},
			content: md,
			footer
		}));
	} catch (error) {
		logger.error("查询新人狂欢状态失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询失败，请稍后再试。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});
function renderOverview(view, md) {
	md.addText("陨星大陆，灵气复苏。凡人之躯踏上仙途，七重试炼，是为入道之基。");
	md.addNewline();
	md.addNewline();
	md.addBold(`修行第${view.currentDayIndex}天 / 共${view.eventDays}天`);
	md.addNewline();
	md.addText(`⏰ ${view.timeRange}`);
	md.addNewline();
	if (view.nextUnlockText) {
		md.addText(`⏳ ${view.nextUnlockText}`);
		md.addNewline();
	}
	md.addNewline();
	for (const day of view.overviewDays) {
		if (day.status === "LOCKED") {
			md.addText(`⏳第${day.day}天-${day.theme}-尚未开启`);
			md.addNewline();
			continue;
		}
		const icon = day.status === "MISSED" ? "❌" : day.status === "CLAIMED" ? "✅" : "✨";
		md.addText(`${icon}第${day.day}天-${day.theme}${day.taskSummary} `);
		if (day.command) addOptions(md, [{
			label: "查看",
			command: day.command
		}]);
	}
	md.addNewline();
	md.addNewline();
	md.addText(view.totalText);
}
function renderDayDetail(day, view, md) {
	if (day < 1 || day > view.contentDays) {
		md.addText(`无效的天数，请输入 1-${view.contentDays}。`);
		return;
	}
	const detail = view.detailDays.find((value) => value.day === day);
	if (!detail?.configExists) {
		md.addText(`第${day}天配置不存在。`);
		return;
	}
	md.addBold(`第${day}天 - ${detail.theme}`);
	md.addNewline();
	if (detail.flavor) {
		md.addText(detail.flavor);
		md.addNewline();
	}
	if (detail.status === "LOCKED") {
		md.addText("⏳ 此重试炼尚未开启，请静心等待。");
		return;
	}
	md.addText(`📦 修行所得：${detail.rewardText}`);
	const rewardIcon = detail.status === "CLAIMED" ? "✅" : detail.status === "MISSED" ? "❌" : "⏳";
	md.addText(` ${rewardIcon}${detail.rewardStatus}`);
	md.addNewline();
	for (const task of detail.tasks) {
		md.addNewline();
		md.addBold(`📋 ${task.label}历练`);
		md.addNewline();
		md.addText(task.progressText);
		md.addNewline();
		md.addNewline();
		for (const milestone of task.milestones) if (milestone.status === "CLAIMED") {
			md.addText(`✅ ${milestone.text}`);
			md.addNewline();
		} else if (milestone.status === "CLAIMABLE") {
			md.addText(`🎁 ${milestone.text} `);
			if (milestone.command) addOptions(md, [{
				label: "领取",
				command: milestone.command
			}]);
		} else {
			md.addText(`🔒 ${milestone.text}`);
			md.addNewline();
		}
	}
}

//#endregion
export { res_default as default };