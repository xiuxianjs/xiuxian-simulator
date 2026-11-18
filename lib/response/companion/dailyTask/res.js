import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCompanionTasks } from "../../../api/bot/companion-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/dailyTask/res.ts
/**
* 道侣日常任务 - 查看
*
* 指令：
*   /道侣任务         → 查看任务列表
*   /道侣任务 领取     → 提示已改为自动发放
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = e.MessageText.trim().match(/^[!！/#＃]?道侣任务(?:\s+(.*))?\s*$/);
	const args = match?.[1]?.trim() ?? "";
	const [, next] = useEvent();
	if (!match) return next();
	let response;
	try {
		response = await runRobotBusiness(e, "companion.tasks", { args }, parseRobotCompanionTasks, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
	} catch {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "道侣任务",
			content: Format.createMarkdown().addText("查看道侣任务失败，请稍后再试")
		}));
		return;
	}
	if (response.handled) return;
	const result = response.data;
	if (result.code === "AUTO_CLAIM_HINT") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "道侣任务",
			content: md,
			footer: [{
				label: "道侣任务",
				command: "/道侣任务"
			}, {
				label: "我的道侣",
				command: "/我的道侣"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	for (const task of result.data.tasks) {
		const statusText = task.completedCount > 0 ? "已完成" : "未完成";
		const progressText = `${task.completedCount}/${task.dailyLimit}`;
		const earnedText = task.earnedTongxin > 0 ? `（已获得 ${task.earnedTongxin} 同心值）` : "";
		md.addText(`【${task.index}】${task.name}`);
		md.addBlockquote(createQuoteMarkdown([
			`同心值：${task.rewardDesc}`,
			`进度：${progressText}`,
			`状态：${statusText}${earnedText}`
		]));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "道侣日常任务",
		content: md,
		footer: [{
			label: "信息",
			command: "/我的道侣"
		}, {
			label: "双修",
			command: "/双修"
		}]
	}));
});

//#endregion
export { res_default as default };