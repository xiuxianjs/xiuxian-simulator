import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotNewcomerTaskReward } from "../../../api/bot/newcomer-activity.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/activity/newcomerTaskClaim/res.ts
/**
* 新人任务领取指令
* 领取指定ID的任务里程碑奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const match = e.MessageText.trim().match(/新人任务领取\s+(\d+)/);
		const taskConfigId = match ? parseInt(match[1], 10) : null;
		const loaded = await runRobotBusiness(e, "newcomer-activity.claim-task", { taskConfigId }, parseRobotNewcomerTaskReward, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const reward = loaded.data;
		const md = Format.createMarkdown();
		const rewardParts = [];
		if (reward.spiritCrystal > 0) rewardParts.push(`灵晶×${reward.spiritCrystal}`);
		if (reward.vipExpYuan > 0) rewardParts.push(`VIP经验+${reward.vipExpYuan}`);
		const rewardText = rewardParts.join("、") || "无";
		md.addBold("【新人狂欢】");
		md.addNewline();
		md.addText("任务里程碑奖励领取成功！");
		md.addNewline();
		md.addText(`获得：${rewardText}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch (error) {
		logger.error("领取新人任务奖励失败:", error);
		const md = Format.createMarkdown();
		md.addText("领取失败，请稍后再试。");
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