import { requestBackend } from "./client.js";

//#region src/api/bot/checkin-shop-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("签到商店数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("签到商店数值字段不完整");
	return value;
}
async function getBackendCheckInShop(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	const data = record(await requestBackend(bid, "get_players_id_check_in_shop_products", { path: { id: uid } }));
	if (!Array.isArray(data.products)) throw new Error("签到商店缺少商品列表");
	return {
		signInCoin: number(data.signInCoin),
		products: data.products.map((value) => {
			const row = record(value);
			if (typeof row.name !== "string" || row.description !== null && typeof row.description !== "string" || typeof row.canBuy !== "boolean") throw new Error("签到商店商品字段不完整");
			return {
				id: number(row.id),
				name: row.name,
				description: row.description,
				quantity: number(row.quantity),
				price: number(row.price),
				monthlyLimit: number(row.monthlyLimit),
				bought: number(row.bought),
				remaining: number(row.remaining),
				canBuy: row.canBuy
			};
		})
	};
}

//#endregion
export { getBackendCheckInShop };