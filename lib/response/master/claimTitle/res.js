import { BackendAPIError } from "../../../api/bot/client.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterClaimTitle } from "../../../api/bot/master-actions.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/claimTitle/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const send = async (text, advice = masterRecoveryTips("master.title-claim", text), buttons = []) => {
		const content = Format.createMarkdown().addText(text);
		appendMiddlewareAdvice(content, advice);
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "领取师门称号",
			content,
			footer: [
				{
					label: "我的师门",
					command: "/我的师门"
				},
				{
					label: "我的称号",
					command: "/我的称号"
				},
				...buttons
			]
		}));
	};
	try {
		if ((await runRobotBusiness(e, "master.title-claim", {}, parseMasterClaimTitle, next, adviceRenderer((reply) => send(reply.text, reply.advice, reply.buttons)))).handled) return;
		await send("「桃李满天下」称号已发放至你的称号列表，可前往我的称号进行佩戴。");
	} catch (error) {
		await send(error instanceof BackendAPIError && error.code === "IDEMPOTENCY_IN_PROGRESS" ? "操作繁忙，请稍后再试。" : "领取失败，请稍后再试。");
	}
});

//#endregion
export { res_default as default };