import { toCurrencyName } from "../../constants/currency.js";
import { parseShopListArgs } from "../../api/bot/catalog-query-reuse.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import "../../constants/index.js";
import { SHOP_META } from "./meta.js";
import { MARKET_FILTER_PRIMARY_LABELS, MARKET_PRIMARY_CATEGORY_KEYS, MARKET_SECONDARY_CATEGORY_LABELS, getMarketSecondaryCategoryKey, isMarketFilterPrimaryLabel, isMarketSecondaryParentLabel } from "../market/categories.js";

//#region src/response/shop/filters.ts
function parseShopBrowseCommand(text, defaultShopCode) {
	const tokens = text.trim().split(/\s+/);
	const searchIndex = tokens.indexOf("搜索");
	let keyword;
	let pageToken;
	if (searchIndex >= 0) {
		if (tokens.length > searchIndex + 2 && /^\d+$/.test(tokens.at(-1) ?? "")) pageToken = tokens.pop();
		keyword = tokens.splice(searchIndex + 1).join(" ");
		tokens.pop();
	}
	const parsed = parseShopListArgs(tokens.join(" "), defaultShopCode);
	if (pageToken) parsed.page = Math.max(1, Number(pageToken));
	const filters = {};
	let categoryLabel = "全部";
	let secondaryLabel;
	let error;
	const categoryIndex = tokens.indexOf("筛选");
	const primary = tokens[categoryIndex + 1];
	if (categoryIndex >= 0 && primary) {
		if (primary === "兑换") {
			filters.category = "currency";
			categoryLabel = primary;
		} else if (isMarketFilterPrimaryLabel(primary)) {
			filters.category = MARKET_PRIMARY_CATEGORY_KEYS[primary]?.type;
			categoryLabel = primary;
			const secondary = tokens[categoryIndex + 2];
			if (isMarketSecondaryParentLabel(primary) && MARKET_SECONDARY_CATEGORY_LABELS[primary].some((label) => label === secondary)) {
				filters.subtype = getMarketSecondaryCategoryKey(primary, secondary)?.subtype;
				secondaryLabel = secondary;
			}
		} else error = "未找到这个商品分类";
	}
	if (searchIndex >= 0) {
		if (!keyword) error = "请输入商品名称";
		else filters.keyword = keyword;
	}
	if (tokens.includes("可购")) filters.availableOnly = true;
	if (tokens.includes("价格升序")) filters.sort = "price_asc";
	if (tokens.includes("价格降序")) filters.sort = "price_desc";
	if (filters.sort && !parsed.currencyCode) error = "请先选择币种，再按价格排序";
	return {
		...parsed,
		filters,
		categoryLabel,
		secondaryLabel,
		error
	};
}
function buildShopBrowseCommand(selection, patch = {}, page = 1) {
	const next = {
		...selection,
		...patch
	};
	const tokens = [next.shopCode ? `/${SHOP_META[next.shopCode]?.listCmd ?? "商店"}` : "/商店"];
	if (next.currencyCode) tokens.push(toCurrencyName(next.currencyCode));
	if (next.categoryLabel !== "全部") tokens.push("筛选", next.categoryLabel, ...next.secondaryLabel ? [next.secondaryLabel] : []);
	if (next.filters.availableOnly) tokens.push("可购");
	if (next.filters.sort) tokens.push(next.filters.sort === "price_asc" ? "价格升序" : "价格降序");
	if (next.filters.keyword) tokens.push("搜索", next.filters.keyword);
	return [...tokens, String(page)].join(" ");
}
function appendShopSearch(md, selection) {
	md.addButton(markdownButtonLabel("搜索"), {
		data: buildShopBrowseCommand(selection, { filters: {
			...selection.filters,
			keyword: void 0
		} }).replace(/ 1$/, " 搜索 "),
		autoEnter: false
	});
	if (selection.filters.keyword) md.addText(` ${selection.filters.keyword}`);
	md.addNewline();
}
function createShopCategoryFooter(selection) {
	return MARKET_FILTER_PRIMARY_LABELS.map((label) => ({
		label,
		selected: selection.categoryLabel === label,
		command: buildShopBrowseCommand(selection, {
			categoryLabel: label,
			secondaryLabel: void 0
		})
	}));
}

//#endregion
export { appendShopSearch, buildShopBrowseCommand, createShopCategoryFooter, parseShopBrowseCommand };