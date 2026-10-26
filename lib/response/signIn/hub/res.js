import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseCheckInHub } from "../../../api/bot/checkin-hub.js";
import "../../../api/bot/checkin-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/signIn/hub/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	const retryCommands = {
		日常签到: "/日常签到",
		新人签到: "/新人签到",
		登仙台签到: "/登仙台签到",
		活动签到: "/活动签到",
		宗门签到: "/宗门签到",
		新人狂欢签到: "/新人狂欢签到",
		初入仙途签到: "/初入仙途签到"
	};
	const calendars = {
		日常签到: "日常",
		新人签到: "新人",
		活动签到: "活动",
		新人狂欢签到: "狂欢",
		初入仙途签到: "狂欢",
		登仙台签到: "时段"
	};
	try {
		const loaded = await runRobotBusiness(e, "checkin.hub", {}, parseCheckInHub, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "签到",
				content: Format.createMarkdown().addText(reply.text),
				footer: [
					{
						label: "签到概览",
						command: "/签到概览"
					},
					{
						label: "签到商店",
						command: "/商店 签到"
					},
					{
						label: "任务面板",
						command: "/任务面板"
					},
					{
						label: "主页",
						command: "/我"
					}
				]
			}));
		});
		if (loaded.handled) return;
		const results = loaded.data;
		for (const item of results) {
			const buttons = [];
			if (calendars[item.name]) buttons.push({
				label: item.name === "登仙台签到" ? "时段" : "日历",
				command: `/签到日历 ${calendars[item.name]}`
			});
			if (item.status === "error" && retryCommands[item.name]) buttons.push({
				label: `重试${item.name}`,
				command: retryCommands[item.name]
			});
			md.addBlockquote(createQuoteMarkdown([`${item.status === "done" ? "🎉" : item.status === "skip" ? "·" : "❌"} ${item.name}：${item.message}`], buttons));
		}
	} catch (error) {
		md.addText(`❌ 签到结果暂未确认，请先查看签到概览核对：${error instanceof Error ? error.message : "请稍后再试"}`);
	}
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "签到",
		content: md,
		footer: [[
			{
				label: "签到概览",
				command: "/签到概览"
			},
			{
				label: "签到商店",
				command: "/商店 签到"
			},
			{
				label: "任务面板",
				command: "/任务面板"
			},
			{
				label: "主页",
				command: "/我"
			}
		]]
	}));
});

//#endregion
export { res_default as default };