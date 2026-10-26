import { assertMarketPriceRange, parseBackendMarketSellable } from "./market-trade.js";

//#region src/api/bot/market-sell-query.ts
/** Original display-only mapping; eligibility and prices remain server-owned. */
function presentMarketSellable(page, category) {
	const displayType = category === "equipment" ? "equipment" : category === "profession_tool" ? "professionTool" : category === "skill_book" ? "skillBook" : "item";
	return {
		total: page.total,
		totalPages: page.totalPages,
		items: page.items.map((item) => ({
			...item,
			...item.attributes,
			id: item.userItemId,
			type: displayType,
			priceRange: item.priceRange ? {
				min: item.priceRange.minPrice,
				max: item.priceRange.maxPrice,
				ref: item.priceRange.referencePrice
			} : void 0
		}))
	};
}
function parseRobotMarketSell(value, expected, category) {
	if (!value || typeof value !== "object" || Array.isArray(value) || !("mode" in value) || value.mode !== expected) throw new Error("交易上架响应不完整");
	if (value.mode === "choose") return { mode: "choose" };
	if (value.mode === "list") return {
		mode: "list",
		page: presentMarketSellable(parseBackendMarketSellable(value), category)
	};
	if (value.mode !== "start" || !("range" in value)) throw new Error("交易上架响应不完整");
	assertMarketPriceRange(value.range, "市场价格区间响应不完整");
	if ("message" in value && typeof value.message !== "string") throw new Error("交易上架响应不完整");
	if ("listingId" in value && (typeof value.listingId !== "number" || !Number.isSafeInteger(value.listingId))) throw new Error("交易上架响应不完整");
	return {
		mode: "start",
		range: value.range,
		..."message" in value ? { message: value.message } : {},
		..."listingId" in value ? { listingId: value.listingId } : {}
	};
}

//#endregion
export { parseRobotMarketSell, presentMarketSellable };