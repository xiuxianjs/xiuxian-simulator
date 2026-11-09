import { parseGuildShopPage } from "./guild-shop-page.js";
import { parseGuildWorkflow } from "./guild-workflow.js";
import { parseGuildShopExchange } from "./guild-shop-actions.js";

//#region src/api/bot/guild-shop-robot-query.ts
const guildShopRefreshReference = /^r1_[0-9a-z]{1,13}_j_[0-9a-z]{1,13}_[0-9a-f]{24}$/;
function parseRobotGuildShop(value, refresh, uid) {
	if (!refresh) return {
		outcome: "shop",
		page: parseGuildShopPage(value),
		receipt: null
	};
	const row = value;
	if (row?.outcome === "preview") {
		if (typeof row.reference !== "string" || !guildShopRefreshReference.test(row.reference) || typeof row.cost !== "number" || !Number.isSafeInteger(row.cost) || row.cost <= 0) throw new Error("宗门商店刷新预览不完整");
		return {
			outcome: "preview",
			reference: row.reference,
			cost: row.cost
		};
	}
	const data = parseGuildWorkflow({ action: "shop_refresh" }, uid, value);
	if (data.pageError) return {
		outcome: "receipt",
		receipt: data.receipt
	};
	return {
		outcome: "shop",
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
export { guildShopRefreshReference, parseRobotGuildShop, parseRobotGuildShopExchange };