//#region src/api/bot/group-subscription-business.ts
function parseGroupSubscriptionResult(value, action) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(action === "enable" ? "群订阅开启响应不完整" : "群订阅关闭响应不完整");
	const data = value;
	const field = action === "enable" ? "switched" : "disabled";
	if (typeof data[field] !== "boolean") throw new Error(action === "enable" ? "群订阅开启响应不完整" : "群订阅关闭响应不完整");
	return {
		switched: action === "enable" ? data[field] : false,
		disabled: action === "disable" ? data[field] : false
	};
}

//#endregion
export { parseGroupSubscriptionResult };