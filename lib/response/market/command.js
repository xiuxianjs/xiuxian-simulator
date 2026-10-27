import { MARKET_FILTER_PRIMARY_LABELS, MARKET_PRIMARY_CATEGORY_KEYS, getMarketSecondaryCategoryKey, isMarketFilterPrimaryLabel, isMarketSecondaryParentLabel } from "./categories.js";

//#region src/response/market/command.ts
const MARKET_PREFIX_RE = /^(?:!|！|\/|#|＃)?(?:交易所|珍宝楼)\s*/;
const MARKET_DISPLAY_NAME = "珍宝楼";
const MARKET_ENTRY_COMMAND = "/珍宝楼";
const SORT_OPTIONS = [
	{
		label: "最新",
		key: "latest",
		aliases: ["最新"]
	},
	{
		label: "价格升序",
		key: "price_asc",
		aliases: ["价格升序"]
	},
	{
		label: "价格降序",
		key: "price_desc",
		aliases: ["价格降序"]
	},
	{
		label: "品级升序",
		key: "grade_asc",
		aliases: ["品级升序"]
	},
	{
		label: "品级降序",
		key: "grade_desc",
		aliases: ["品级降序"]
	}
];
const SORT_ALIAS_TO_LABEL = SORT_OPTIONS.reduce((acc, option) => {
	option.aliases.forEach((alias) => {
		acc[alias] = option.label;
	});
	return acc;
}, {});
const SORT_LABEL_TO_KEY = SORT_OPTIONS.reduce((acc, option) => {
	acc[option.label] = option.key;
	return acc;
}, {});
const getFilterCategoryDisplay = (primaryCategoryCN, secondaryCategoryCN) => {
	if (!primaryCategoryCN) return;
	if (!secondaryCategoryCN) return primaryCategoryCN;
	return `${primaryCategoryCN}/${secondaryCategoryCN}`;
};
const resolveFilterCategory = (primaryCategoryCN, secondaryCategoryCN) => {
	if (!primaryCategoryCN) return {};
	if (primaryCategoryCN === "全部") return { categoryCN: "全部" };
	if (!secondaryCategoryCN) return {
		categoryCN: getFilterCategoryDisplay(primaryCategoryCN),
		categoryKey: MARKET_PRIMARY_CATEGORY_KEYS[primaryCategoryCN]
	};
	if (!isMarketSecondaryParentLabel(primaryCategoryCN)) return { invalidText: `${primaryCategoryCN} ${secondaryCategoryCN}` };
	const categoryKey = getMarketSecondaryCategoryKey(primaryCategoryCN, secondaryCategoryCN);
	if (!categoryKey) return { invalidText: `${primaryCategoryCN} ${secondaryCategoryCN}` };
	return {
		categoryCN: getFilterCategoryDisplay(primaryCategoryCN, secondaryCategoryCN),
		categoryKey
	};
};
const normalizePage = (value) => {
	const page = Number(value ?? 1);
	if (!Number.isFinite(page)) return 1;
	return Math.max(1, Math.floor(page));
};
const resolveSortLabel = (input) => {
	if (!input) return "最新";
	return SORT_ALIAS_TO_LABEL[input] ?? "最新";
};
const popTrailingPage = (tokens) => {
	const last = tokens[tokens.length - 1];
	if (!last || !/^\d+$/.test(last)) return 1;
	tokens.pop();
	return normalizePage(last);
};
const popTrailingSortLabel = (tokens) => {
	const last = tokens[tokens.length - 1];
	if (!last || !SORT_ALIAS_TO_LABEL[last]) return "最新";
	tokens.pop();
	return resolveSortLabel(last);
};
const buildMarketCommand = (input) => {
	const page = normalizePage(typeof input.page === "number" ? String(input.page) : input.page);
	const sortCN = resolveSortLabel(input.sortCN);
	if (input.mode === "search") {
		if (!input.keyword) return `${MARKET_ENTRY_COMMAND} 搜索`;
		return `${MARKET_ENTRY_COMMAND} 搜索 ${input.keyword} ${sortCN} ${page}`;
	}
	if (input.mode === "filter") {
		if (!input.primaryCategoryCN) return `${MARKET_ENTRY_COMMAND} 筛选`;
		const categoryTokens = input.secondaryCategoryCN ? `${input.primaryCategoryCN} ${input.secondaryCategoryCN}` : input.primaryCategoryCN;
		return `${MARKET_ENTRY_COMMAND} 筛选 ${categoryTokens} ${sortCN} ${page}`;
	}
	if (sortCN === "最新") return `${MARKET_ENTRY_COMMAND} ${page}`;
	return `${MARKET_ENTRY_COMMAND} ${sortCN} ${page}`;
};
const buildPageCommand = (input) => {
	const sortCN = resolveSortLabel(input.sortCN);
	if (input.mode === "search") return input.keyword ? `${MARKET_ENTRY_COMMAND} 搜索 ${input.keyword} ${sortCN} {page}` : `${MARKET_ENTRY_COMMAND} 搜索`;
	if (input.mode === "filter") {
		if (!input.primaryCategoryCN) return `${MARKET_ENTRY_COMMAND} 筛选`;
		const categoryTokens = input.secondaryCategoryCN ? `${input.primaryCategoryCN} ${input.secondaryCategoryCN}` : input.primaryCategoryCN;
		return `${MARKET_ENTRY_COMMAND} 筛选 ${categoryTokens} ${sortCN} {page}`;
	}
	if (sortCN === "最新") return `${MARKET_ENTRY_COMMAND} {page}`;
	return `${MARKET_ENTRY_COMMAND} ${sortCN} {page}`;
};
const buildTitle = (mode, categoryCN, keyword) => {
	if (mode === "search" && keyword) return `${MARKET_DISPLAY_NAME}搜索：${keyword}`;
	if (mode === "filter" && categoryCN) return categoryCN === "全部" ? `${MARKET_DISPLAY_NAME}筛选` : `${MARKET_DISPLAY_NAME}筛选：${categoryCN}`;
	if (mode === "search") return `${MARKET_DISPLAY_NAME}搜索`;
	if (mode === "filter") return `${MARKET_DISPLAY_NAME}筛选`;
	return MARKET_DISPLAY_NAME;
};
const parseMarketCommand = (text) => {
	const normalized = String(text ?? "").trim();
	if (!/^(?:!|！|\/|#|＃)?(?:交易所|珍宝楼)(?:\s+.+)?$/.test(normalized)) return null;
	const argsText = normalized.replace(MARKET_PREFIX_RE, "").trim();
	if (!argsText) return {
		mode: "browse",
		sortCN: "最新",
		sort: "latest",
		page: 1,
		command: buildMarketCommand({
			mode: "browse",
			page: 1
		}),
		pageCommand: buildPageCommand({
			mode: "browse",
			sortCN: "最新"
		}),
		title: buildTitle("browse")
	};
	const tokens = argsText.split(/\s+/).filter(Boolean);
	const first = tokens[0];
	if (first === "搜索") {
		const working = tokens.slice(1);
		const page = popTrailingPage(working);
		const sortCN = popTrailingSortLabel(working);
		const keyword = working.join(" ").trim();
		return {
			mode: "search",
			keyword: keyword || void 0,
			sortCN,
			sort: SORT_LABEL_TO_KEY[sortCN],
			page,
			missing: keyword ? void 0 : "keyword",
			command: buildMarketCommand({
				mode: "search",
				keyword,
				sortCN,
				page
			}),
			pageCommand: buildPageCommand({
				mode: "search",
				keyword,
				sortCN
			}),
			title: buildTitle("search", void 0, keyword || void 0)
		};
	}
	if (first === "筛选") {
		const working = tokens.slice(1);
		const page = popTrailingPage(working);
		const sortCN = popTrailingSortLabel(working);
		const [primaryToken, secondaryToken, ...restTokens] = working;
		const primaryCategoryCN = primaryToken && isMarketFilterPrimaryLabel(primaryToken) ? primaryToken : void 0;
		const secondaryCategoryCN = secondaryToken;
		const invalidText = restTokens.length > 0 ? working.join(" ") : void 0;
		const resolvedCategory = invalidText ? { invalidText } : resolveFilterCategory(primaryCategoryCN, secondaryCategoryCN);
		const missing = working.length === 0 ? "category" : primaryCategoryCN ? void 0 : "category";
		return {
			mode: "filter",
			categoryCN: resolvedCategory.categoryCN,
			categoryKey: resolvedCategory.categoryKey,
			primaryCategoryCN,
			secondaryCategoryCN,
			sortCN,
			sort: SORT_LABEL_TO_KEY[sortCN],
			page,
			missing,
			invalidText: resolvedCategory.invalidText,
			command: buildMarketCommand({
				mode: "filter",
				primaryCategoryCN,
				secondaryCategoryCN,
				sortCN,
				page
			}),
			pageCommand: buildPageCommand({
				mode: "filter",
				primaryCategoryCN,
				secondaryCategoryCN,
				sortCN
			}),
			title: buildTitle("filter", resolvedCategory.categoryCN)
		};
	}
	const working = tokens.slice();
	const page = popTrailingPage(working);
	const sortCN = popTrailingSortLabel(working);
	const invalidText = working.join(" ").trim() || void 0;
	return {
		mode: "browse",
		sortCN,
		sort: SORT_LABEL_TO_KEY[sortCN],
		page,
		invalidText,
		command: buildMarketCommand({
			mode: "browse",
			sortCN,
			page
		}),
		pageCommand: buildPageCommand({
			mode: "browse",
			sortCN
		}),
		title: buildTitle("browse")
	};
};
const shouldQueryMarket = (parsed) => {
	if (parsed.invalidText) return false;
	if (parsed.mode === "search") return Boolean(parsed.keyword);
	if (parsed.mode === "filter") return Boolean(parsed.primaryCategoryCN) && !parsed.invalidText;
	return true;
};
const getMarketHeaderButtons = () => [
	{
		label: "珍宝楼",
		command: "/珍宝楼 1"
	},
	{
		label: "记录",
		command: "/我的交易记录"
	},
	{
		label: "上架",
		command: "/交易上架"
	},
	{
		label: "信誉",
		command: "/信誉分"
	}
];
const buildButtonRow = (labels, buildCommand) => {
	return labels.map((label) => ({
		label,
		command: buildCommand(label)
	}));
};
const createMarketCommandBar = (parsed) => {
	const sortedCommand = (sortCN) => buildMarketCommand({
		mode: parsed.mode === "search" && parsed.keyword ? "search" : parsed.mode === "filter" && parsed.primaryCategoryCN ? "filter" : "browse",
		keyword: parsed.keyword,
		primaryCategoryCN: parsed.primaryCategoryCN,
		secondaryCategoryCN: parsed.secondaryCategoryCN,
		sortCN,
		page: 1
	});
	return [
		[
			{
				label: "我的上架",
				command: "/我的上架"
			},
			{
				label: "记录",
				command: "/我的交易记录"
			},
			{
				label: "搜索",
				command: "/珍宝楼 搜索"
			}
		],
		buildButtonRow(MARKET_FILTER_PRIMARY_LABELS, (label) => buildMarketCommand({
			mode: "filter",
			primaryCategoryCN: label,
			sortCN: "最新",
			page: 1
		})).map((button) => ({
			...button,
			selected: shouldQueryMarket(parsed) && button.label === (parsed.primaryCategoryCN ?? "全部")
		})),
		buildButtonRow(["价格升序", "价格降序"], sortedCommand),
		buildButtonRow(["品级升序", "品级降序"], sortedCommand)
	];
};
const appendMarketCommandGuide = (md, parsed) => {
	if (parsed.invalidText) md.addText("未识别该筛选，请选择下方分类。");
	else if (parsed.mode === "search" && !parsed.keyword) md.addText("搜索物品：/珍宝楼 搜索 名称");
	else if (parsed.mode === "filter" && !parsed.categoryCN) md.addText("请选择下方分类。");
};
const getMarketEmptyText = (parsed) => {
	if (parsed.mode === "search" && parsed.keyword) return `没有找到与“${parsed.keyword}”相关的上架物品`;
	if (parsed.mode === "filter" && parsed.categoryCN) return parsed.categoryCN === "全部" ? "当前没有可展示的上架物品" : `${parsed.categoryCN}分类暂无上架物品`;
	return "暂无上架物品";
};

//#endregion
export { appendMarketCommandGuide, buildMarketCommand, createMarketCommandBar, getMarketEmptyText, getMarketHeaderButtons, parseMarketCommand, shouldQueryMarket };