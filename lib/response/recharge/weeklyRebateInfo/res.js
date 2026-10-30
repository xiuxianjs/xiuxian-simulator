import { WEEKLY_CUMULATIVE_MODE } from "../../../api/schemas/weekly-rebate-query.js";
import { parseBackendWeeklyRebate } from "../../../api/bot/weekly-rebate-queries.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/weeklyRebateInfo/res.ts
const packNavigation = [
	{
		label: "日礼包",
		command: "/充值 日礼包",
		autoEnter: false
	},
	{
		label: "周礼包",
		command: "/充值 周礼包",
		autoEnter: false
	},
	{
		label: "月礼包",
		command: "/充值 月礼包",
		autoEnter: false
	}
];
function cumulativeView(data) {
	const md = Format.createMarkdown();
	md.addText(`本周截止：${data.deadlineText}`).addNewline();
	md.addText(`本周累充：${data.weekRechargeText}元`).addNewline();
	if (!data.eligible) md.addText(`账号需满${data.minAccountDays}天才能参与周周返利（当前${data.daysSinceRegistration}天）`).addNewline();
	for (const tier of data.rewards) {
		const claimable = data.eligible && tier.configured && !tier.claimed && tier.canClaim;
		const status = tier.claimed ? "已领取" : !tier.configured ? "奖励待配置" : claimable ? "可领取" : tier.statusTag;
		const card = Format.createMarkdown().addBold(tier.label).addNewline().addText(`状态：${status}`).addNewline();
		card.addText(`奖励：${tier.configured ? tier.rewardText : "奖励待配置"}`);
		if (!tier.claimed && tier.remainingAmount > 0) card.addNewline().addText(`距本档还差：${tier.remainingText}元`);
		if (claimable) addOptions(card, [{
			label: "领取",
			command: `/周周返利领取 ${tier.thresholdYuan} ${data.weekStart}`,
			autoEnter: false
		}]);
		md.addBlockquote(card);
	}
	const loop = data.loop;
	const loopCard = Format.createMarkdown().addBold("循环返利").addNewline();
	loopCard.addText(`状态：${loop.statusTag}`).addNewline();
	loopCard.addText(`累计可得：${loop.totalCount}次；已领：${loop.claimedCount}次；当前可领：${loop.claimableCount}次`).addNewline();
	loopCard.addText(`奖励：${loop.configured ? loop.rewardText : "奖励待配置"}`);
	if (data.eligible && loop.configured && loop.canClaim && loop.claimableCount > 0) addOptions(loopCard, [{
		label: "领取全部",
		command: `/周周返利领取 循环 ${data.weekStart} ${loop.expectedLoopCount}`,
		autoEnter: false
	}]);
	md.addBlockquote(loopCard);
	md.addText("648元以上每累计10元可得1张藏宝图，不足10元部分不跨周结转。").addNewline();
	md.addText("本轮截止后，未领取的达标奖励将通过个人邮件发放（含循环返利）。");
	return md;
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	const send = async (title, md, options) => {
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益",
				autoEnter: false
			}],
			isPrivate,
			bid,
			title,
			content: md,
			footer: options?.footer
		}));
	};
	try {
		const response = await runRobotBusiness(e, "recharge.weekly-info", {}, parseBackendWeeklyRebate, parentNext, async (reply) => {
			await message.send(FormatGui({
				header: [{
					label: "返回权益",
					command: "/我的权益",
					autoEnter: false
				}],
				isPrivate,
				bid,
				title: "周周返利",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const data = response.data;
		if (data.mode === "weekly_cumulative") {
			await send("周周返利", cumulativeView(data), { footer: packNavigation });
			return;
		}
		const result = {
			...data,
			dayRewards: data.rewards
		};
		const md = Format.createMarkdown();
		md.addText(`今日：${result.todayLabel}`);
		md.addNewline();
		md.addText(`今日充值：${result.todayRechargeText}元/${result.thresholdYuan}元`);
		md.addNewline();
		for (const day of result.dayRewards) {
			const title = day.canClaim ? `${day.label} · 可领取` : `${day.label} · ${day.statusTag}`;
			md.addBlockquote(createQuoteMarkdown([title, day.rewardText], day.canClaim ? [{
				label: "领取",
				command: `/周周返利领取 ${day.day}`,
				autoEnter: false
			}] : []));
		}
		md.addNewline();
		await send("周周返利", md, { footer: [{
			label: "充值",
			command: "/充值",
			autoEnter: false
		}] });
	} catch (error) {
		logger.error("查询周周返利信息失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询失败，请稍后再试。");
		await send("周周返利", md);
	}
});

//#endregion
export { res_default as default };