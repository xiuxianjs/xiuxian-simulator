import { filterFeatureFormat, presentationCommandFilter } from "../utils/featureVisibility.js";
import { NotificationDeliveryPendingError, NotificationDeliveryUncertainError } from "../types/notification.js";
import { FormatGui } from "../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/notification/delivery.ts
/** 订阅是玩家意愿，权限是通道状态；任何投递失败都不改变玩家订阅。 */
async function deliverNotification(input, channel, now = Date.now) {
	if (!input.enabled) return {
		route: "history",
		reason: "proactive_disabled"
	};
	const recipientBid = input.recipientBid ?? input.mention;
	const allowed = await presentationCommandFilter(recipientBid ? { UserId: recipientBid } : void 0);
	const filterData = (data) => {
		const format = Format.create();
		format.value.push(...data);
		return filterFeatureFormat(format, allowed).value;
	};
	const tryTarget = async (target, data) => {
		const cached = await channel.read(target);
		if (cached?.state === "blocked") return false;
		if (cached?.retryAt && cached.retryAt > now()) {
			if (input.fallbackOnFailure) return false;
			throw new Error("通知通道暂时冷却，等待重试");
		}
		try {
			await channel.send(target, filterData(data), cached);
			return true;
		} catch (error) {
			if (error instanceof NotificationDeliveryPendingError) throw error;
			if (error instanceof NotificationDeliveryUncertainError) {
				await channel.recordFailure(target);
				throw error;
			}
			if ((await channel.refreshAfterFailure(target))?.state === "blocked") return false;
			await channel.recordFailure(target);
			if (input.fallbackOnFailure) return false;
			throw error;
		}
	};
	const seen = /* @__PURE__ */ new Set();
	const tryGroup = async (target) => {
		const key = JSON.stringify([
			target.platform,
			target.BotId ?? "",
			target.scope,
			target.targetId
		]);
		if (seen.has(key)) return false;
		seen.add(key);
		const data = input.mention ? FormatGui({
			bid: input.mention,
			content: input.data,
			bar: false
		}).format.value : input.data;
		return await tryTarget(target, data);
	};
	if (input.group && await tryGroup(input.group)) return {
		route: "group",
		reason: "sent"
	};
	for (const target of await input.fallbackGroups?.() ?? []) if (await tryGroup(target)) return {
		route: "group",
		reason: "sent"
	};
	if (input.privateTarget) {
		const data = input.mention ? FormatGui({
			isPrivate: true,
			bid: input.mention,
			content: input.data,
			bar: false
		}).format.value : input.data;
		if (await tryTarget(input.privateTarget, data)) return {
			route: "private",
			reason: "sent"
		};
		return {
			route: "history",
			reason: "permission_blocked"
		};
	}
	return {
		route: "history",
		reason: seen.size > 0 ? "permission_blocked" : "no_private_target"
	};
}
/** 仅显式带范围的旧标识可转换，QQ 群成员 ID 不推断为 C2C ID。 */
function legacyNotificationTarget(id, kind, platform, botId) {
	const match = id.match(/^(GROUP|GUILD|C2C|DIRECT):(.+)$/);
	const scopes = {
		GROUP: "group",
		GUILD: "channel",
		C2C: "c2c",
		DIRECT: "direct"
	};
	if (match) return {
		platform,
		scope: scopes[match[1]],
		targetId: match[2],
		BotId: botId
	};
	if (!id || !["qq-bot", "onebot"].includes(platform)) return null;
	if (platform === "qq-bot" && kind === "private") return null;
	return {
		platform,
		scope: kind === "group" ? "group" : "c2c",
		targetId: id,
		BotId: botId
	};
}

//#endregion
export { deliverNotification, legacyNotificationTarget };