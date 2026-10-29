import { parseBackendEventTasks } from "../../../api/bot/event-tasks-queries.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { EVENT_FOOTER, EVENT_HEADER } from "../nav.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/limitedEvent/tasks/res.ts
/**
* 限时活动 - 任务列表
* 指令：/活动任务
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const [, parentNext] = useEvent();
	let taskGroups;
	try {
		const response = await runRobotBusiness(e, "limited-event.tasks", {}, parseBackendEventTasks, parentNext, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "活动任务",
				header: EVENT_HEADER,
				content: Format.createMarkdown().addText(reply.text),
				footer: EVENT_FOOTER
			}));
		});
		if (response.handled) return;
		taskGroups = response.data;
	} catch {
		md.addText("查看活动任务失败，请稍后再试");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "活动任务",
			header: EVENT_HEADER,
			content: md,
			footer: EVENT_FOOTER
		}));
		return;
	}
	if (!taskGroups.length) {
		md.addText("当前没有进行中的限时活动任务");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "活动任务",
			header: EVENT_HEADER,
			content: md,
			footer: EVENT_FOOTER
		}));
		return;
	}
	for (const group of taskGroups) {
		md.addText(`📋 ${group.eventTitle} - ${group.subTitle}`);
		md.addNewline();
		for (const task of group.tasks) {
			const statusIcon = task.claimed ? "✅" : task.completed ? "🎁" : "⬜";
			const progress = `${task.currentValue}/${task.targetValue}`;
			md.addBlockquote(createQuoteMarkdown([
				`${statusIcon} ${task.taskName}（${progress}）`,
				...task.taskDescription ? [task.taskDescription] : [],
				`奖励：${task.rewardTextParts.length > 0 ? task.rewardTextParts.join("、") : "无"}`
			], task.canClaim ? [{
				label: "领取",
				command: `/活动任务领取 ${task.taskId}`
			}] : []));
		}
		md.addNewline();
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "活动任务",
		header: EVENT_HEADER,
		content: md,
		footer: EVENT_FOOTER
	}));
});

//#endregion
export { res_default as default };