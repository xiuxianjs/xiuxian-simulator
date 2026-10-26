import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { giftCodeRecoveryTips } from "../../giftCodeRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotOldGameCode } from "../../../api/bot/gift-code-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/comeback/oldGameCode/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const md = Format.createMarkdown();
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown();
		content.addText(text);
		appendMiddlewareAdvice(content, giftCodeRecoveryTips("gift-codes.old-game-issue", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "凡人修仙礼包码",
			content
		}));
	};
	let giftCode;
	try {
		const loaded = await runRobotBusiness(e, "gift-codes.old-game-issue", {}, parseRobotOldGameCode, next, adviceRenderer((reply) => sendMiddlewareReply(e, {
			...reply,
			title: "凡人修仙礼包码"
		})));
		if (loaded.handled) return;
		giftCode = loaded.data.giftCode;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "当前无法获取凡人修仙礼包码，请稍后再试");
		return;
	}
	if (!isPrivate) {
		md.addText("为保障您的礼包码不被盗取，请私聊发送指令获取礼包码");
		appendMiddlewareAdvice(md, giftCodeRecoveryTips("gift-codes.old-game-issue", "请私聊获取"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "凡人修仙礼包码",
			content: md
		}));
		return;
	}
	md.addText(`你的凡人修仙礼包码：${giftCode}`);
	md.addButton(markdownButtonLabel("立即兑换"), { data: `/礼包码 ${giftCode}` });
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "凡人修仙礼包码",
		content: md
	}));
});

//#endregion
export { res_default as default };