//#region src/api/bot/home-notification-queries.ts
const orderedTypes = [
	"UNREAD_EMAIL",
	"PENDING_FRIEND",
	"UNREAD_NOTICE",
	"PENDING_TEAM",
	"PENDING_GUILD",
	"PENDING_COMPANION",
	"UNREAD_ROBBERY",
	"UNREAD_COUNTER_ATTACK",
	"ACTIVE_BOUNTY_ON_ME",
	"MATURE_CAVE_PLOT",
	"KILL_GOD",
	"UNREAD_FLYMAIL",
	"UNDELIVERED_NOTIFICATION"
];
const types = new Set(orderedTypes);
const isNotificationType = (value) => typeof value === "string" && types.has(value);
const hasCanonicalOrder = (items) => items.every((item, index) => {
	return index === 0 || orderedTypes.indexOf(items[index - 1].type) < orderedTypes.indexOf(item.type);
});
function validateHomeNotifications(data) {
	if (!Array.isArray(data) || data.some((item) => !item || typeof item !== "object" || !isNotificationType(item.type) || !Number.isSafeInteger(item.count) || item.count < 1) || !hasCanonicalOrder(data)) throw new Error("主页通知响应不完整");
	return data;
}

//#endregion
export { validateHomeNotifications };