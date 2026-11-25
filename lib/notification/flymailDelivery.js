import { notificationSettingsData } from "./presentation.js";
import { withFlyMailGroupReminder } from "./flymailBuffer.js";
import { acquireFlyMailGroupReminder } from "../api/bot/notification-cache.js";
import { getNotificationPrivateTarget, notificationChannel } from "./channel.js";
import { getNotificationSubscriptionTarget } from "../api/bot/notification-relay.js";
import { deliverNotification, legacyNotificationTarget } from "./delivery.js";
import { deliverNotificationOnce } from "./service.js";
import { Format } from "alemonjs";

//#region src/notification/flymailDelivery.ts
/** 所有飞信仅向收件人私聊发送正文；群内仅发送不含会话信息的提醒。 */
async function deliverFlyMailNotification(eventId, bid, data, enabled, ownerUserId) {
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
	const owner = ownerUserId ?? ownerPlayerId(eventId);
	const group = owner > 0 ? subscriberGroup(await getNotificationSubscriptionTarget(owner)) : null;
	if (!group) return {
		route: "history",
		reason: "no_target"
	};
	const reminder = Format.create().addMarkdown(Format.createMarkdown().addText("你有新的飞信，请私聊机器人发送 /飞信 查看。")).value;
	if (!await acquireFlyMailGroupReminder(platform, bid)) return {
		route: "history",
		reason: "group_reminder_cooldown"
	};
	return (await withFlyMailGroupReminder(bid, () => deliverNotification({
		group,
		recipientBid: bid,
		data: notificationSettingsData(reminder, "flymail.message.received"),
		enabled,
		fallbackOnFailure: true
	}, notificationChannel))).route === "group" ? {
		route: "group",
		reason: "reminded"
	} : {
		route: "history",
		reason: "no_target"
	};
}
/** 仅当订阅开启时返回订阅群目标；未订阅或已关闭时不向任何群投递。 */
function subscriberGroup(subscription) {
	if (!subscription?.isEnabled) return null;
	return {
		platform: subscription.platform,
		scope: subscription.targetScope,
		targetId: subscription.channelId,
		BotId: subscription.botId ?? void 0
	};
}
/** 飞信事件 ID 形如 flymail.message:{消息ID}:received:{玩家ID}，只读取末尾的玩家 ID。 */
function ownerPlayerId(eventId) {
	const value = Number(eventId.slice(eventId.lastIndexOf(":") + 1));
	return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

//#endregion
export { deliverFlyMailNotification, ownerPlayerId, subscriberGroup };