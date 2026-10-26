import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/rewardResponse.ts
function companionRewardResponse(operation, title, decode) {
	return onResponse(selects, async (e) => {
		const [message] = useMessage$1();
		const [, next] = useEvent();
		const render = async (lines) => {
			await message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid: e.UserId,
				title,
				content: Format.createMarkdown().addBlockquote(createQuoteMarkdown(lines, [{
					label: "代签到",
					command: "/道侣签到"
				}, {
					label: "代领月卡",
					command: "/道侣月卡"
				}])),
				footer: [{
					label: "我的道侣",
					command: "/我的道侣"
				}]
			}));
		};
		try {
			const response = await runRobotBusiness(e, operation, {}, decode, next, (reply) => render([reply.text]));
			if (!response.handled) await render(response.data);
		} catch (error) {
			logger.error(`${title}失败`, error);
			await render(["道侣代领结果暂时无法显示，请稍后重试；已结算的奖励不会重复发放。"]);
		}
	});
}

//#endregion
export { companionRewardResponse };