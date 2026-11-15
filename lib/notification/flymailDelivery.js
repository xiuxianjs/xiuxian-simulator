import { notificationSettingsData } from "./presentation.js";
import { withFlyMailGroupReminder } from "./flymailBuffer.js";
import { acquireFlyMailGroupReminder, readPlatformAvailability, readPlatformGroupCandidates } from "../api/bot/notification-cache.js";
import { getNotificationPrivateTarget, notificationChannel } from "./channel.js";
import { deliverNotification, legacyNotificationTarget } from "./delivery.js";
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
	const reminder = Format.create().addMarkdown(Format.createMarkdown().addText("你有新的飞信，请私聊机器人发送 /飞信 查看。")).value;
	const groups = await readPlatformGroupCandidates(platform, bid);
	let acquiredGroupReminder = false;
	for (const { target } of groups) {
		if ((await readPlatformAvailability(target, bid))?.available === false) continue;
		if (!acquiredGroupReminder) {
			if (!await acquireFlyMailGroupReminder(platform, bid)) return {
				route: "history",
				reason: "group_reminder_cooldown"
			};
			acquiredGroupReminder = true;
		}
		if ((await withFlyMailGroupReminder(bid, () => deliverNotification({
			group: target,
			recipientBid: bid,
			data: notificationSettingsData(reminder, "flymail.message.received"),
			enabled,
			fallbackOnFailure: true
		}, notificationChannel))).route === "group") return {
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