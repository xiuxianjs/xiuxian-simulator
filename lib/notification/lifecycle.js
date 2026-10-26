import { recordPlatformAvailability } from "../api/bot/notification-cache.js";
import { rememberNotificationTarget } from "./channel.js";
import { logger } from "alemonjs";

//#region src/notification/lifecycle.ts
const lifecycleEvents = [
	"private.friend.add",
	"private.friend.remove",
	"guild.join",
	"guild.exit",
	"member.add",
	"member.remove"
];
/** 平台生命周期仅改变对应通道，不触碰玩家存档或订阅意愿。 */
async function handleNotificationLifecycle(event) {
	if (!lifecycleEvents.includes(event.name) || event.Platform !== "qq-bot") return false;
	const raw = event.value && typeof event.value === "object" ? event.value : {};
	const firstID = (...values) => values.find((value) => typeof value === "string" && value.length > 0) ?? "";
	const botId = event.Target?.BotId ?? event.BotId;
	const privateEvent = event.name.startsWith("private.friend.");
	const memberEvent = event.name.startsWith("member.");
	const memberId = memberEvent ? firstID(event.MemberId, raw.member_openid) : "";
	const privateId = firstID(event.UserId, raw.openid, raw.user_openid);
	const groupId = firstID(event.ChannelId, event.GuildId, raw.group_openid);
	const target = event.Target ? {
		...event.Target,
		platform: event.Platform,
		BotId: botId
	} : privateEvent && privateId ? {
		platform: event.Platform,
		BotId: botId,
		scope: "c2c",
		targetId: privateId
	} : groupId ? {
		platform: event.Platform,
		BotId: botId,
		scope: "group",
		targetId: groupId
	} : void 0;
	const expectedScope = privateEvent ? "c2c" : "group";
	if (!target?.targetId || target.scope !== expectedScope || !botId || memberEvent && !memberId) {
		logger.warn("跳过字段不完整的平台生命周期事件", {
			event: event.name,
			missingBot: !botId,
			missingTarget: !target?.targetId,
			invalidScope: !!target && target.scope !== expectedScope,
			missingMember: memberEvent && !memberId
		});
		return false;
	}
	const available = event.name.endsWith(".add") || event.name === "guild.join";
	const occurredAt = event.OccurredAt;
	const observedOnly = !Number.isSafeInteger(occurredAt) || (occurredAt ?? 0) <= 0;
	await recordPlatformAvailability(target, available, observedOnly ? Date.now() : occurredAt, memberId ?? "", observedOnly);
	event.Target = target;
	event.BotId = botId;
	if (memberEvent) event.MemberId = memberId;
	if (event.name === "private.friend.add") await rememberNotificationTarget({
		...event,
		Target: target
	});
	return true;
}

//#endregion
export { handleNotificationLifecycle, lifecycleEvents };