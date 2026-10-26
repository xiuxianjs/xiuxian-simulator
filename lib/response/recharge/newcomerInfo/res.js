import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendNewcomerRechargeInfo } from "../../../api/bot/newcomer-recharge-queries.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/newcomerInfo/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	try {
		const response = await runRobotBusiness(e, "recharge.newcomer-info", {}, parseBackendNewcomerRechargeInfo, parentNext, async (reply) => {
			await message.send(FormatGui({
				header: [{
					label: "返回权益",
					command: "/我的权益"
				}],
				isPrivate,
				bid,
				title: "新人返利",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const data = response.data;
		const result = {
			currentDay: data.currentDay,
			contentDays: data.contentDays,
			todayRechargedYuan: data.todayRechargedAmount / 100,
			thresholdYuan: data.thresholdAmount / 100,
			dayRewards: data.rewards
		};
		const md = Format.createMarkdown();
		md.addText(`第${result.currentDay}/${result.contentDays}天`);
		md.addNewline();
		md.addText(`今日充值：${result.todayRechargedYuan.toFixed(2)}元/${result.thresholdYuan}元`);
		md.addNewline();
		for (const day of result.dayRewards) {
			const title = day.canClaim ? `第${day.day}天 · 可领取` : `第${day.day}天 · ${day.statusTag}`;
			md.addBlockquote(createQuoteMarkdown([title, day.rewardText], day.canClaim ? [{
				label: "领取",
				command: `/新人返利领取 ${day.day}`
			}] : []));
		}
		md.addNewline();
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}],
			isPrivate,
			bid,
			title: "新人返利",
			content: md,
			footer: [{
				label: "充值",
				command: "/充值"
			}]
		}));
	} catch (error) {
		logger.error("查询新人狂欢信息失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询失败，请稍后再试。");
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}],
			isPrivate,
			bid,
			title: "新人返利",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };