import { readPlatformAvailability, readPlatformDeliveryReceipt, readPlatformGroupCandidates, storePlatformDeliveryReceipt } from "../api/bot/notification-cache.js";
import { deliverNotification, legacyNotificationTarget } from "./delivery.js";
import { getNotificationPrivateTarget, notificationChannel, refreshNotificationPermission } from "./channel.js";
import { getNotificationSubscriptionTarget, recordNotificationSubscriptionDelivery } from "../api/bot/notification-relay.js";
import { logger } from "alemonjs";

//#region src/notification/service.ts
const subscriptionTarget = (subscription) => ({
	platform: subscription.platform,
	scope: subscription.targetScope,
	targetId: subscription.channelId,
	BotId: subscription.botId ?? void 0
});
/** 成功后数据库 ack 失败时复用回执。7 天覆盖常规重试窗口，不是玩家历史的保留期限。 */
async function deliverNotificationOnce(eventId, send) {
	const cached = await readPlatformDeliveryReceipt(eventId);
	if (cached) return cached;
	const delivery = await send();
	await storePlatformDeliveryReceipt(eventId, delivery).catch((error) => logger.error("通知回执缓存失败，继续确认数据库事件", error));
	return delivery;
}
async function deliverPlayerNotification(userId, bid, data, enabled, options) {
	const subscription = enabled && !options?.privateOnly ? await getNotificationSubscriptionTarget(userId) : null;
	const group = subscription?.isEnabled ? subscriptionTarget(subscription) : null;
	const platform = subscription?.platform ?? process.env.login ?? "";
	const botId = subscription?.botId ?? void 0;
	const isGroup = (target) => target.scope === "group" || target.scope === "channel";
	const fallbackGroups = enabled && !options?.privateOnly && (!subscription || subscription.isEnabled) ? async () => (await readPlatformGroupCandidates(platform, bid, botId)).map((activity) => activity.target) : void 0;
	const candidate = enabled ? await getNotificationPrivateTarget(platform, bid, botId) ?? legacyNotificationTarget(bid, "private", platform, botId) : null;
	const privateTarget = options?.privateOnly && candidate && !["c2c", "direct"].includes(candidate.scope) ? null : candidate;
	return await deliverNotification({
		group,
		fallbackGroups,
		privateTarget,
		data,
		mention: bid,
		enabled,
		fallbackOnFailure: options?.fallbackOnFailure
	}, {
		...notificationChannel,
		async read(target) {
			if (isGroup(target)) {
				const member = await readPlatformAvailability(target, bid);
				if (member?.available === false) return {
					state: "blocked",
					source: "event",
					updatedAt: member.updatedAt
				};
			}
			const state = await notificationChannel.read(target);
			return isGroup(target) && (!state || state.state === "unknown") ? await refreshNotificationPermission(target) : state;
		},
		async refreshAfterFailure(target) {
			if (isGroup(target)) {
				const member = await readPlatformAvailability(target, bid);
				if (member?.available === false) return {
					state: "blocked",
					source: "event",
					updatedAt: member.updatedAt
				};
			}
			return await notificationChannel.refreshAfterFailure(target);
		},
		async send(target, content, previous) {
			try {
				if (isGroup(target) && (await readPlatformAvailability(target, bid))?.available === false) throw new Error("已记录成员离开原群，暂停原群投递");
				if (isGroup(target) && options?.sendGroup) await options.sendGroup(target, (replacement) => notificationChannel.send(target, replacement ?? content, previous));
				else await notificationChannel.send(target, content, previous);
			} catch (error) {
				if (target === group && subscription) await recordNotificationSubscriptionDelivery(userId, subscription, error instanceof Error ? error.message : String(error)).catch((err) => logger.error("记录通知失败信息失败", err));
				throw error;
			}
			if (target === group && subscription) await recordNotificationSubscriptionDelivery(userId, subscription).catch((error) => logger.error("记录通知成功信息失败", error));
		}
	});
}
/** Worker 与旧 Redis 消息也经过同一权限/回执处理，保留原有事件格式。 */
async function deliverLegacyNotification(input, enabled) {
	const platform = process.env.login ?? "";
	const group = input.cid ? legacyNotificationTarget(input.cid, "group", platform) : null;
	const privateTarget = input.uid ? await getNotificationPrivateTarget(platform, input.uid) ?? legacyNotificationTarget(input.uid, "private", platform) : null;
	return await deliverNotification({
		group,
		privateTarget,
		recipientBid: input.uid,
		data: input.data,
		enabled
	}, {
		...notificationChannel,
		send: (target, data, previous) => notificationChannel.send(target, target === privateTarget ? data.filter((block) => block.type !== "Mention") : data, previous)
	});
}

//#endregion
export { deliverLegacyNotification, deliverNotificationOnce, deliverPlayerNotification };