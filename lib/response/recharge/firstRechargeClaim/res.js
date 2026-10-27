import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { issuedRewardText } from "../../../utils/issuedRewardText.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotFirstRechargeClaim } from "../../../api/bot/first-recharge-claim.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/firstRechargeClaim/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, parentNext] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const feedback = async (text) => {
		await message.send(FormatGui({
			header: [{
				label: "返回充值",
				command: "/充值"
			}],
			isPrivate,
			bid,
			title: "首充礼包",
			content: Format.createMarkdown().addText(text)
		}));
	};
	let data;
	try {
		const result = await runRobotBusiness(e, "recharge.first-claim", { input: e.MessageText ?? "" }, parseRobotFirstRechargeClaim, parentNext, (reply) => feedback(reply.text));
		if (result.handled) return;
		data = result.data;
	} catch (error) {
		logger.error("领取礼包奖励失败:", error);
		await feedback("领取失败，请稍后再试。");
		return;
	}
	const rewardText = issuedRewardText(data.issued);
	await message.send(FormatGui({
		header: [{
			label: "返回充值",
			command: "/充值"
		}],
		isPrivate,
		bid,
		title: "首充礼包",
		content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([`${data.tierYuan}元档 · 已领取`, `获得：${rewardText}`]))
	}));
});

//#endregion
export { res_default as default };