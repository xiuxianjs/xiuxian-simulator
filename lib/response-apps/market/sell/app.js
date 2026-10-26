import { getBackendMarketSellable } from "../../../api/bot/market-trade.js";
import { marketWorkflow } from "../../../api/bot/market-community-views.js";

//#region src/response-apps/market/sell/app.ts
const marketCategory = (key) => key.type === "prop" || key.type === "material" ? "item" : key.type;
const assetDisplayType = (key) => {
	if (key.type === "equipment") return "equipment";
	if (key.type === "profession_tool") return "professionTool";
	if (key.type === "skill_book") return "skillBook";
	return "item";
};
async function fetchSellableList(params) {
	try {
		const page = await getBackendMarketSellable(params.bid, params.uid, {
			category: params.categoryKey.type,
			subtype: params.categoryKey.subtype,
			page: params.page,
			pageSize: 10
		});
		return {
			code: "OK",
			data: {
				total: page.total,
				totalPages: page.totalPages,
				items: page.items.map((item) => ({
					...item,
					...item.attributes,
					id: item.userItemId,
					type: assetDisplayType(params.categoryKey),
					priceRange: item.priceRange ? {
						min: item.priceRange.minPrice,
						max: item.priceRange.maxPrice,
						ref: item.priceRange.referencePrice
					} : void 0
				}))
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查看上架物品列表失败，请稍后再试" }
		};
	}
}
async function fetchPriceRange(params) {
	try {
		const result = await marketWorkflow(params.bid, params.uid, {
			action: "sell",
			category: marketCategory(params.categoryKey),
			userItemId: params.userItemId,
			firstNumber: params.firstNumber,
			secondNumber: params.secondNumber
		}, params.request, params.messageText);
		const range = result.range;
		if (!range) throw new Error("市场上架规则响应不完整");
		return {
			code: "OK",
			submission: result.listingError ? {
				code: "FAIL",
				data: {
					message: result.listingError.message,
					canAdjustListings: result.listingError.code === "MARKET_ACTIVE_LISTING_LIMIT"
				}
			} : result.receipt ? {
				code: "OK",
				data: {
					message: result.receipt.message,
					listingId: result.receipt.listingId
				}
			} : void 0,
			data: {
				minPrice: range.minPrice,
				maxPrice: range.maxPrice,
				refPrice: range.referencePrice,
				source: range.source,
				isAboveThreshold: range.credibilityReady,
				maxListingQuantity: range.maxListingQuantity,
				fixedQuantity: range.fixedQuantity
			}
		};
	} catch {
		return {
			code: "LOAD_FAILED",
			data: { message: "市场上架规则加载失败，请稍后再试" }
		};
	}
}

//#endregion
export { fetchPriceRange, fetchSellableList };