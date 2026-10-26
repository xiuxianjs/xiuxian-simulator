import { CHINESE_TO_CATEGORY_KEY } from "../../constants/marketCategories.js";

//#region src/response/market/categories.ts
const MARKET_FILTER_PRIMARY_LABELS = [
	"全部",
	"道具",
	"材料",
	"装备",
	"天工",
	"功法",
	"本命"
];
const MARKET_SELL_PRIMARY_LABELS = [
	"道具",
	"材料",
	"装备",
	"天工",
	"功法",
	"本命"
];
const MARKET_PRIMARY_CATEGORY_KEYS = {
	全部: void 0,
	道具: { type: "prop" },
	材料: { type: "material" },
	装备: { type: "equipment" },
	天工: { type: "profession_tool" },
	功法: { type: "skill_book" },
	本命: { type: "soul_artifact" }
};
const MARKET_SECONDARY_CATEGORY_LABELS = {
	道具: [
		"丹药",
		"礼物",
		"其它"
	],
	材料: [
		"草药",
		"经验材料",
		"其它"
	]
};
const isMarketFilterPrimaryLabel = (value) => {
	return MARKET_FILTER_PRIMARY_LABELS.includes(value);
};
const isMarketSellPrimaryLabel = (value) => {
	return MARKET_SELL_PRIMARY_LABELS.includes(value);
};
const isMarketSecondaryParentLabel = (value) => {
	return value === "道具" || value === "材料";
};
const getMarketSecondaryCategoryKey = (primaryCategory, secondaryCategory) => {
	if (primaryCategory === "道具") {
		if (secondaryCategory === "丹药") return CHINESE_TO_CATEGORY_KEY["丹药"];
		if (secondaryCategory === "礼物") return CHINESE_TO_CATEGORY_KEY["礼物"];
		if (secondaryCategory === "其它") return {
			type: "prop",
			subtype: "other"
		};
		return null;
	}
	if (secondaryCategory === "草药") return CHINESE_TO_CATEGORY_KEY["草药"];
	if (secondaryCategory === "经验材料") return CHINESE_TO_CATEGORY_KEY["经验材料"];
	if (secondaryCategory === "其它") return {
		type: "material",
		subtype: "other"
	};
	return null;
};

//#endregion
export { MARKET_FILTER_PRIMARY_LABELS, MARKET_PRIMARY_CATEGORY_KEYS, MARKET_SECONDARY_CATEGORY_LABELS, MARKET_SELL_PRIMARY_LABELS, getMarketSecondaryCategoryKey, isMarketFilterPrimaryLabel, isMarketSecondaryParentLabel, isMarketSellPrimaryLabel };