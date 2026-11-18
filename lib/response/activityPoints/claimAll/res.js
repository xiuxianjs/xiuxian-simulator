import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotActivityClaimAll } from "../../../api/bot/activity-points-robot.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/activityPoints/claimAll/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const msg = e.MessageText?.trim() || "";
	const isDaily = /^[!！/#＃]?(?:领取全部|一键领取)日常活跃奖励$/.test(msg);
	const isWeekly = /^[!！/#＃]?(?:领取全部|一键领取)周常活跃奖励$/.test(msg);
	if (!isDaily && !isWeekly) return;
	const type = isDaily ? "daily" : "weekly";
	const title = isDaily ? "日常活跃" : "周常活跃";
	const backCommand = isDaily ? "/日常活跃" : "/周常活跃";
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content,
			footer: [{
				label: "返回",
				command: backCommand
			}]
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, `activity-points.claim-all-${type}`, {}, parseRobotActivityClaimAll, next, (reply) => renderFailure(reply.text));
		if (loaded.handled) return;
		const result = { data: loaded.data };
		const md = Format.createMarkdown();
		md.addText(result.data.partial ? `已领取部分${type === "daily" ? "日常" : "周常"}活跃奖励：` : `【${result.data.userName}】一键领取${type === "daily" ? "日常" : "周常"}活跃奖励成功！`);
		md.addNewline();
		md.addNewline();
		if (result.data.taskRewards.length > 0) {
			md.addText(`任务奖励：${result.data.taskRewards.map((reward) => `${reward.name}×${reward.amount}`).join("、")}`);
			md.addNewline();
		}
		for (const item of result.data.claimed) {
			const rewardText = item.rewards.length > 0 ? item.rewards.map((reward) => `${reward.name}×${reward.amount}`).join("、") : "无";
			md.addText(`🎯 ${item.requiredPoints}点：${rewardText}`);
			md.addNewline();
		}
		if (result.data.partial && result.data.error) md.addText(`剩余奖励领取失败：${result.data.error}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content: md,
			footer: [{
				label: "返回",
				command: backCommand
			}]
		}));
	} catch {
		await renderFailure("一键领取失败，请稍后再试。");
	}
});

//#endregion
export { res_default as default };