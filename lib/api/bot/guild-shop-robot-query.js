import { parseGuildShopPage } from "./guild-shop-page.js";
import { parseGuildShopExchange } from "./guild-shop-actions.js";
import { parseGuildWorkflow } from "./guild-workflow.js";

//#region src/api/bot/guild-shop-robot-query.ts
function parseRobotGuildShop(value, refresh, uid) {
	if (!refresh) return {
		page: parseGuildShopPage(value),
		receipt: null
	};
	const data = parseGuildWorkflow({ action: "shop_refresh" }, uid, value);
	return {
		page: parseGuildShopPage(data.page),
		receipt: data.receipt
	};
}
function parseRobotGuildShopExchange(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门商店兑换响应不完整");
	const data = value;
	if (data.outcome === "usage") return { outcome: "usage" };
	if (data.outcome !== "result") throw new Error("宗门商店兑换响应不完整");
	return {
		outcome: "result",
		receipt: parseGuildShopExchange(data.receipt)
	};
}

//#endregion
export { parseRobotGuildShop, parseRobotGuildShopExchange };