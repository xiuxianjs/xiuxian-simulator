import { displayCurrencyText } from "../../../constants/currency.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendFirstRechargeInfo } from "../../../api/bot/first-recharge-queries.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/firstRechargeInfo/res.ts
/**
* 礼包奖励信息指令
* 查看礼包奖励档位状态和领取进度
* 指令格式：/礼包奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	try {
		const response = await runRobotBusiness(e, "recharge.first-info", {}, parseBackendFirstRechargeInfo, parentNext, async (reply) => {
			await message.send(FormatGui({
				header: [{
					label: "返回充值",
					command: "/充值"
				}],
				isPrivate,
				bid,
				title: "首充礼包",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const result = { tiers: response.data.tiers.map((tier) => ({
			...tier,
			rewardText: displayCurrencyText(tier.rewardText)
		})) };
		const md = Format.createMarkdown();
		md.addText("按首次充值金额解锁").addNewline();
		const requestedPage = Number(e.MessageText.trim().match(/\s+(\d+)$/)?.[1] ?? 1);
		const totalPages = Math.max(1, Math.ceil(result.tiers.length / 5));
		const page = Math.max(1, Math.min(totalPages, requestedPage));
		for (const tier of result.tiers.slice((page - 1) * 5, page * 5)) {
			const status = tier.status === "claimable" ? "可领取" : tier.status === "claimed" ? "已领取" : "未解锁";
			const quote = createQuoteMarkdown([`${tier.tierAmountYuan}元档 · ${status}`, tier.rewardText], tier.status === "claimable" ? [{
				label: "领取",
				command: `/领取礼包奖励 ${tier.tierAmountYuan}`
			}] : []);
			md.addBlockquote(quote);
		}
		await message.send(FormatGui({
			header: [{
				label: "返回充值",
				command: "/充值"
			}],
			isPrivate,
			bid,
			title: "首充礼包",
			nav: {
				current: page,
				total: totalPages,
				command: "/礼包奖励 {page}"
			},
			content: md
		}));
	} catch (error) {
		logger.error("查询礼包奖励信息失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询失败，请稍后再试。");
		await message.send(FormatGui({
			header: [{
				label: "返回充值",
				command: "/充值"
			}],
			isPrivate,
			bid,
			title: "首充礼包",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };