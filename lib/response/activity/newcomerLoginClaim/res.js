import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotNewcomerLogin } from "../../../api/bot/checkin-robot-query.js";
import { NEWCOMER_CONTENT_DAYS } from "../../../constants/recharge.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/activity/newcomerLoginClaim/res.ts
/**
* 新人狂欢签到指令
* 前6天仅领取当天；第7天奖励可在剩余活动期内领取一次
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "checkin.newcomer-login", {}, parseRobotNewcomerLogin, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text),
				footer: [{
					label: "日历",
					command: "/签到日历 狂欢"
				}]
			}));
		});
		if (loaded.handled) return;
		const result = loaded.data;
		const md = Format.createMarkdown();
		if (result.code === "ALL_CLAIMED" || result.code === "NO_CLAIMABLE") {
			if (result.code === "ALL_CLAIMED") md.addText(`恭喜！您已完成全部${7}天签到！`);
			else md.addText("当前暂无可领取奖励；前6天错过不可补领，请查看日历。");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "日历",
					command: "/签到日历 狂欢"
				}]
			}));
			return;
		}
		const rewardParts = [];
		if (result.data.spiritCrystal > 0) rewardParts.push(`灵晶×${result.data.spiritCrystal}`);
		if (result.data.grantedItems.length > 0) rewardParts.push(...result.data.grantedItems);
		const rewardText = rewardParts.join("、") || "无";
		md.addBold("【初入仙途】");
		md.addNewline();
		md.addText(`✅ 第${result.data.claimDay}天修行完成！`);
		md.addNewline();
		md.addText(`获得：${rewardText}`);
		const footer = [{
			label: "日历",
			command: "/签到日历 狂欢"
		}];
		md.addNewline();
		if (result.data.claimDay <= 6) footer.push({
			label: "查看历练",
			command: `/初入仙途 ${result.data.claimDay}`
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			header: [{
				label: "返回",
				command: "/初入仙途"
			}],
			content: md,
			footer
		}));
	} catch (error) {
		logger.error("领取新人登录奖励失败:", error);
		const md = Format.createMarkdown();
		md.addText("领取失败，请稍后再试。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "日历",
				command: "/签到日历 狂欢"
			}]
		}));
	}
});

//#endregion
export { res_default as default };