import { BackendAPIError } from "../../../api/bot/client.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendNewcomerRechargeClaim } from "../../../api/bot/newcomer-recharge-claim.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/newcomerClaim/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, parentNext] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const feedback = async (text) => {
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}],
			isPrivate,
			bid,
			title: "新人返利",
			content: Format.createMarkdown().addText(text)
		}));
	};
	let data;
	try {
		const response = await runRobotBusiness(e, "recharge.newcomer-claim", { input: e.MessageText ?? "" }, parseBackendNewcomerRechargeClaim, parentNext, (reply) => feedback(reply.text));
		if (response.handled) return;
		data = response.data;
	} catch (error) {
		logger.error("领取新人狂欢奖励失败:", error);
		await feedback(error instanceof BackendAPIError ? error.message : "领取失败，请稍后再试。");
		return;
	}
	await message.send(FormatGui({
		header: [{
			label: "返回权益",
			command: "/我的权益"
		}],
		isPrivate,
		bid,
		title: "新人返利",
		content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([`第${data.dayIndex}天 · 已领取`, `获得：${data.rewardText}`])),
		footer: [{
			label: "新人返利",
			command: "/新人返利"
		}]
	}));
});

//#endregion
export { res_default as default };