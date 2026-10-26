import { requestBackend } from "./client.js";
import { assertPlayerShopInfo } from "../schemas/player-shop-visit-query.js";
import { PAGE_SIZE } from "../../constants/common.js";
import "../../constants/index.js";

//#region src/api/bot/shop-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("查询接口返回格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("查询接口缺少数值字段");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("查询接口缺少文本字段");
	return value;
}
async function getBackendShopList(bid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendShopList(await requestBackend(bid, "get_market_shops", { query: {
		page: Math.max(1, Math.floor(page)),
		pageSize: 5
	} }));
}
function parseBackendShopList(value) {
	const result = record(value);
	if (!Array.isArray(result.items)) throw new Error("查询接口缺少列表");
	number(result.pageSize);
	return {
		data: result.items.map((value) => {
			const row = record(value);
			assertPlayerShopInfo(row, "商店列表响应不完整");
			return {
				...row,
				description: row.description ?? null
			};
		}),
		pagination: {
			currentPage: number(result.currentPage),
			totalPages: number(result.totalPages),
			total: number(result.total)
		}
	};
}
async function getBackendShopRanking(bid, topN) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendShopRanking(await requestBackend(bid, "get_market_shops_ranking", { query: { topN: Math.min(50, Math.max(1, topN)) } }));
}
function parseBackendShopRanking(result) {
	if (!Array.isArray(result)) throw new Error("查询接口缺少列表");
	return result.map((value) => {
		const row = record(value);
		return {
			rank: number(row.rank),
			shopName: text(row.shopName),
			ownerName: text(row.ownerName),
			heatScore: number(row.heatScore),
			levelName: text(row.levelName),
			totalSales: number(row.totalSales)
		};
	});
}

//#endregion
export { getBackendShopList, getBackendShopRanking, parseBackendShopList, parseBackendShopRanking };