import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/gacha-pull.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("转盘接口响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`转盘接口字段无效: ${field}`);
	return value;
}
function item(value) {
	const row = record(value);
	for (const field of [
		"tierName",
		"tierLabel",
		"itemName",
		"itemType"
	]) if (typeof row[field] !== "string") throw new Error(`转盘接口展示字段无效: ${field}`);
	if (typeof row.isUp !== "boolean") throw new Error("转盘接口展示字段无效: isUp");
	return {
		tierName: row.tierName,
		tierLabel: row.tierLabel,
		itemName: row.itemName,
		itemType: row.itemType,
		quantity: integer(row.quantity, "quantity"),
		isUp: row.isUp
	};
}
async function pullBackendGacha(bid, uid, poolId, count, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGachaPullResult(record(await requestBackend(bid, "post_players_id_gacha_pools_poolId_pull", {
		path: {
			id: uid,
			poolId
		},
		body: { count },
		...writeContext(request)
	})));
}
function parseGachaPullResult(value) {
	const data = record(value);
	if (data.success === false && typeof data.reason === "string" && typeof data.message === "string") return {
		success: false,
		reason: data.reason,
		message: data.message
	};
	if (data.success !== true || typeof data.message !== "string" || !Array.isArray(data.items) || typeof data.costCurrency !== "string" || typeof data.costCurrencyName !== "string") throw new Error("转盘接口响应不完整");
	return {
		success: true,
		message: data.message,
		items: data.items.map(item),
		freeUsed: integer(data.freeUsed, "freeUsed"),
		costAmount: integer(data.costAmount, "costAmount"),
		costCurrency: data.costCurrency,
		costCurrencyName: data.costCurrencyName
	};
}

//#endregion
export { parseGachaPullResult, pullBackendGacha };