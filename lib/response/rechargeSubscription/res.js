import { noticeBubble } from "../presentation/presets.js";
import { rechargeSubscriptionCommand } from "../../api/bot/recharge-subscription.js";
import "../presentation/index.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/rechargeSubscription/res.ts
var res_default = onResponse(selects, async (event) => {
	const [, next] = useEvent();
	const text = (event.MessageText ?? "").trim().replace(/^[/#＃]/, "");
	if (![
		"订阅充值",
		"取消订阅充值",
		"充值身份"
	].includes(text)) {
		next();
		return;
	}
	const [message] = useMessage$1();
	let content;
	try {
		content = await rechargeSubscriptionCommand(event, text === "充值身份" ? "identity" : text === "订阅充值" ? "subscribe" : "unsubscribe");
	} catch (error) {
		content = error instanceof Error ? error.message : "充值订阅失败。";
	}
	await message.send(noticeBubble({
		title: "充值订阅",
		bid: event.UserId,
		isPrivate: [
			event.IsPrivate,
			event.isPrivate,
			event.name.startsWith("private.")
		].some(Boolean),
		lines: [content]
	}));
});

//#endregion
export { res_default as default };