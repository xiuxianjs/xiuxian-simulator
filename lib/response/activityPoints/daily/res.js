import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotActivityPoints } from "../../../api/bot/activity-points-robot.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/activityPoints/daily/res.ts
/**
* 日常活跃指令响应
* 查看日常活跃任务列表、进度和奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "日常活跃",
			content
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "activity-points.daily", {}, (value) => parseRobotActivityPoints(value, "daily"), next, (reply) => renderFailure(reply.text));
		if (loaded.handled) return;
		const contentMd = Format.createMarkdown();
		const { currentPoints, tasks, rewards, taskRewardsCanClaim } = loaded.data;
		const claimable = rewards.filter((r) => r.canClaim);
		contentMd.addText(`当前活跃度：${currentPoints}`);
		contentMd.addNewline();
		if (tasks.length === 0) {
			contentMd.addText("暂无日常任务配置。");
			contentMd.addNewline();
		} else for (const task of tasks) {
			const status = task.completed ? "◆" : "◇";
			const progress = `${task.currentValue}/${task.targetValue}`;
			contentMd.addText(`${status} ${task.name}（${progress}）+${task.activityPoints}活跃`);
			contentMd.addNewline();
		}
		if (rewards.length > 0) {
			contentMd.addNewline();
			contentMd.addText("── 活跃度奖励 ──");
			contentMd.addNewline();
			for (const reward of rewards) {
				const status = reward.claimed ? "✅" : reward.canClaim ? "🔓" : "🔒";
				contentMd.addText(`${status}${reward.requiredPoints}点 → ${reward.name} x${reward.quantity}`);
				if (reward.canClaim) addOptions(contentMd, [{
					label: "领取",
					command: `/领取日常活跃奖励 ${reward.requiredPoints}`
				}]);
				else contentMd.addNewline();
			}
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "日常活跃",
			header: [{
				label: "日常活跃",
				selected: true,
				command: "/日常活跃"
			}, {
				label: "周常活跃",
				command: "/周常活跃"
			}],
			content: contentMd,
			footer: [
				...claimable.length > 0 || taskRewardsCanClaim ? [{
					label: "一键领取",
					command: "/一键领取日常活跃奖励"
				}] : [],
				{
					label: "签到",
					command: "/日常签到"
				},
				{
					label: "更多",
					command: "/更多"
				}
			]
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("查看日常活跃失败，请稍后再试。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "日常活跃",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };