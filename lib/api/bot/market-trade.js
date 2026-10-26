import { requestBackend } from "./client.js";

//#region src/api/bot/market-trade.ts
const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
function assertMarketPriceRange(value, message) {
	const range = record(value);
	if (!range || ![
		"minPrice",
		"maxPrice",
		"referencePrice",
		"templateItemId",
		"maxListingQuantity"
	].every((key) => integer(range[key])) || typeof range.source !== "string" || ![
		"median",
		"base_price",
		"fallback"
	].includes(range.source) || typeof range.credibilityReady !== "boolean" || typeof range.fixedQuantity !== "boolean") throw new Error(message);
}
async function getBackendMarketSellable(bid, uid, query) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendMarketSellable(await requestBackend(bid, "get_players_id_market_sellable", {
		path: { id: uid },
		query
	}));
}
function parseBackendMarketSellable(data) {
	const page = record(data);
	if (!page || !Array.isArray(page.items) || ![
		"total",
		"currentPage",
		"pageSize",
		"totalPages"
	].every((key) => integer(page[key]) && Number(page[key]) >= 0)) throw new Error("可上架物品响应不完整");
	return {
		items: page.items.map((value) => {
			const item = record(value);
			const attributes = record(item?.attributes);
			if (!item || !integer(item.userItemId) || item.userItemId < 1 || !integer(item.templateId) || item.templateId < 1 || typeof item.name !== "string" || typeof item.category !== "string" || item.type !== void 0 && typeof item.type !== "string" || !integer(item.quantity) || item.quantity < 1 || typeof item.grade !== "string" || typeof item.realm !== "string" || !(item.subtype === void 0 || item.subtype === null || typeof item.subtype === "string") || !(item.gradeId === void 0 || item.gradeId === null || integer(item.gradeId)) || !(item.currentLowestPrice === null || finite(item.currentLowestPrice)) || item.equipmentType !== void 0 && typeof item.equipmentType !== "string" || item.typeName !== void 0 && typeof item.typeName !== "string" || item.skillType !== void 0 && typeof item.skillType !== "string" || item.config !== void 0 && !record(item.config) || item.attributes !== void 0 && (!attributes || !Object.values(attributes).every(finite))) throw new Error("可上架物品字段不完整");
			if (item.priceRange !== void 0) assertMarketPriceRange(item.priceRange, "可上架物品价格区间不完整");
			return item;
		}),
		total: page.total,
		currentPage: page.currentPage,
		pageSize: page.pageSize,
		totalPages: page.totalPages
	};
}

//#endregion
export { assertMarketPriceRange, getBackendMarketSellable, parseBackendMarketSellable };