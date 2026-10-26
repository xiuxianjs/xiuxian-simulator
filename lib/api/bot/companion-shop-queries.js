import { getEventCatalog, reportCatalogReuse } from "./catalog-query-reuse.js";
import { requestBackend } from "./client.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/companion-shop-queries.ts
const object = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣商店接口数据不完整");
	return value;
};
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const nullableInteger = (value) => value === null || integer(value);
const nullableText = (value) => value === null || typeof value === "string";
async function getBackendUnifiedShop(bid, uid, page, shopCode, currencyCode) {
	if (!bid) throw new Error("查询缺少平台身份");
	if (currencyCode && currencyCode !== "SPIRIT_STONE" && currencyCode !== "SPIRIT_CRYSTAL" && currencyCode !== "SPIRIT_MILK") throw new Error("商店币种参数无效");
	if (shopCode && ![
		"WANBAOLOU",
		"SHENQI",
		"CHECKIN",
		"TOWER_SCORE",
		"DAOLV",
		"REPUTATION"
	].includes(shopCode)) throw new Error("商店分类参数无效");
	const inline = getEventCatalog(getCurrentEvent(), bid, uid, {
		kind: "shop",
		args: {
			page,
			shopCode: shopCode ?? null,
			currencyCode: currencyCode ?? null
		}
	});
	if (inline !== void 0) try {
		const decoded = decodeShopData(object(inline));
		reportCatalogReuse(getCurrentEvent(), "shop");
		return decoded;
	} catch {
		reportCatalogReuse(getCurrentEvent(), "shop", "invalid_inline_payload");
	}
	return decodeShopData(object(await requestBackend(bid, "get_players_id_shop_products", {
		path: { id: uid },
		query: {
			page,
			shopCode,
			currencyCode
		}
	})));
}
function decodeShopData(data) {
	const access = object(data.access);
	const currencies = object(data.currencies);
	if (![
		"hasCompanion",
		"isFoundationRealm",
		"canUseReputationShop"
	].every((key) => typeof access[key] === "boolean") || !Array.isArray(access.visibleShopCodes) || !access.visibleShopCodes.every((code) => typeof code === "string") || !nullableText(access.deniedReason) || ![
		"spiritStone",
		"spiritsCrystal",
		"spiritsMilk",
		"signInCoin",
		"towerScore",
		"reputation",
		"tongxin",
		"greenBottle"
	].every((key) => integer(currencies[key])) || !Array.isArray(data.products) || !integer(data.page) || data.page < 1 || !integer(data.totalPages) || data.totalPages < 1 || !integer(data.total) || data.total < 0) throw new Error("道侣商店接口数据不完整");
	for (const raw of data.products) {
		const p = object(raw);
		if (!integer(p.productId) || p.productId < 1 || ![
			"shopCode",
			"name",
			"category",
			"priceCurrencyCode",
			"limitPeriod",
			"limitPeriodName",
			"typeLabel"
		].every((key) => typeof p[key] === "string") || ![
			"priceAmount",
			"quantity",
			"used",
			"limit",
			"remaining"
		].every((key) => integer(p[key])) || ![
			"itemId",
			"secondaryPriceAmount",
			"requiredRealmId",
			"requiredStars",
			"discountPriceAmount"
		].every((key) => nullableInteger(p[key])) || p.discountRate !== null && !finiteNumber(p.discountRate) || ![
			"priceCurrencyName",
			"secondaryPriceCurrencyCode",
			"secondaryPriceCurrencyName",
			"grantCurrencyCode",
			"grantCurrencyName",
			"discountLabel",
			"itemType",
			"itemSubtype",
			"requiredRealmName",
			"lockReason"
		].every((key) => nullableText(p[key])) || typeof p.unlocked !== "boolean" || p.nextPurchaseAt !== null && (typeof p.nextPurchaseAt !== "string" || !Number.isFinite(new Date(p.nextPurchaseAt).getTime()))) throw new Error("道侣商店商品数据不完整");
	}
	const facts = data;
	const result = {
		success: true,
		pagination: {
			currentPage: facts.page,
			totalPages: facts.totalPages,
			total: facts.total
		},
		data: facts.products.map((p) => ({
			productId: p.productId,
			shopCode: p.shopCode,
			name: p.name,
			category: p.category,
			itemId: p.itemId ?? void 0,
			priceAmount: p.priceAmount,
			priceCurrencyName: p.priceCurrencyName ?? void 0,
			quantity: p.quantity,
			used: p.used,
			limit: p.limit,
			remaining: p.remaining,
			limitPeriodCN: p.limitPeriodName,
			unlocked: p.unlocked,
			lockReason: p.lockReason ?? void 0,
			discountPriceAmount: p.discountPriceAmount ?? void 0,
			discountLabel: p.discountLabel ?? void 0,
			typeLabel: p.typeLabel,
			secondaryPriceAmount: p.secondaryPriceAmount && p.secondaryPriceCurrencyCode ? p.secondaryPriceAmount : void 0,
			secondaryPriceCurrencyName: p.secondaryPriceAmount && p.secondaryPriceCurrencyCode ? p.secondaryPriceCurrencyName ?? void 0 : void 0,
			grantCurrencyName: p.category === "currency" && p.grantCurrencyCode ? p.grantCurrencyName ?? void 0 : void 0
		}))
	};
	return {
		access: facts.access,
		currencies: facts.currencies,
		result
	};
}

//#endregion
export { decodeShopData, getBackendUnifiedShop };