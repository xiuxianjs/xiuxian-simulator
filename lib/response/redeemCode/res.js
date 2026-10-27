import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../middlewareReply.js";
import { giftCodeRecoveryTips } from "../giftCodeRecovery.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseRobotGiftHub } from "../../api/bot/gift-code-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/redeemCode/res.ts
/**
* 兑换码入口页面
* 指令：/兑换码
* 展示所有兑换码相关指令的快捷入口
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	try {
		if ((await runRobotBusiness(e, "gift-codes.hub", {}, parseRobotGiftHub, next)).handled) return;
	} catch {
		const md = Format.createMarkdown().addText("兑换码入口加载失败，请稍后再试");
		appendMiddlewareAdvice(md, giftCodeRecoveryTips("gift-codes.hub", "入口加载失败"));
		await message.send(FormatGui({
			isPrivate: isPrivateEvent(e),
			bid,
			title: "兑换码",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addButton(markdownButtonLabel("领取邀请奖励"), { data: "/领取邀请奖励" });
	md.addText(" ——— 领取邀请好友累积奖励");
	md.addNewline();
	md.addText("公测预约");
	md.addText(" ——— 公测预约登记与查看");
	message.send(FormatGui({
		isPrivate: isPrivateEvent(e),
		bid,
		title: "兑换码",
		header: [{
			label: "返回",
			command: "/我"
		}],
		content: md
	}));
});

//#endregion
export { res_default as default };