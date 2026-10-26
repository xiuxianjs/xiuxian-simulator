import { readPlatformAvailability, readPlatformGroupCandidates } from "../api/bot/notification-cache.js";
import { FormatGui } from "../utils/messageHelper.js";
import { deliverNotification, legacyNotificationTarget } from "./delivery.js";
import { getNotificationPrivateTarget, notificationChannel } from "./channel.js";
import { deliverNotificationOnce } from "./service.js";
import { Format } from "alemonjs";

//#region src/notification/flymailDelivery.ts
/** 所有飞信仅向收件人私聊发送正文；群内仅发送不含会话信息的提醒。 */
async function deliverFlyMailNotification(eventId, bid, data, enabled) {
	if (!enabled) return {
		route: "history",
		reason: "proactive_disabled"
	};
	if (!bid) return {
		route: "history",
		reason: "no_target"
	};
	const platform = process.env.login ?? "";
	const privateDelivery = await deliverNotificationOnce(`${eventId}:private`, async () => {
		const candidate = await getNotificationPrivateTarget(platform, bid) ?? legacyNotificationTarget(bid, "private", platform);
		const privateTarget = candidate && ["c2c", "direct"].includes(candidate.scope) ? candidate : null;
		return await deliverNotification({
			privateTarget,
			recipientBid: bid,
			data,
			enabled,
			fallbackOnFailure: true
		}, notificationChannel);
	});
	if (privateDelivery.route === "private") return privateDelivery;
	const reminder = FormatGui({
		bid,
		bar: false,
		content: Format.createMarkdown().addText("你有新的飞信，请私聊机器人发送 /飞信 查看。")
	}).format.value;
	const groups = await readPlatformGroupCandidates(platform, bid);
	for (const { target } of groups) {
		if ((await readPlatformAvailability(target, bid))?.available === false) continue;
		if ((await deliverNotification({
			group: target,
			recipientBid: bid,
			data: reminder,
			enabled,
			fallbackOnFailure: true
		}, notificationChannel)).route === "group") return {
			route: "group",
			reason: "reminded"
		};
	}
	return {
		route: "history",
		reason: "no_target"
	};
}

//#endregion
export { deliverFlyMailNotification };