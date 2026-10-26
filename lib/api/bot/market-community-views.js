import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseRobberyRecords } from "./robbery-records.js";
import { GLOSSARY_PAGE_SIZE } from "../../constants/glossary.js";
import { assertMarketMutationResult, assertMarketPurchasePreview } from "../schemas/market-trade.js";
import { assertMarketPriceRange } from "./market-trade.js";
import { parseMyMarketListings } from "./my-market-listings.js";
import { parseMarketCredibility } from "./market-credibility.js";
import { parseGlossaryEntry } from "./glossary-queries.js";

//#region src/api/bot/market-community-views.ts
function identity(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return bid;
}
async function marketWorkflow(bid, uid, body, request, repeatCommand) {
	let context = { requestId: request?.requestId };
	if (body.action === "purchase") try {
		context = writeContext(request);
	} catch (error) {
		if (body.confirmed) throw error;
		body = {
			...body,
			readOnly: true
		};
	}
	else if (body.action === "sell" && (body.firstNumber ?? 0) > 0 && (body.category !== "item" || (body.secondNumber ?? 0) > 0)) try {
		context = writeContext(request);
	} catch {
		body = {
			...body,
			readOnly: true
		};
	}
	const data = await requestBackend(identity(bid), "post_players_id_market_workflow", {
		headers: repeatPresentationHeaders(request?.idempotencyKey ? repeatCommand : void 0),
		path: { id: uid },
		body,
		...context
	});
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("市场操作响应不完整");
	if (body.action === "sell") {
		assertMarketPriceRange(data.range, "市场价格区间响应不完整");
		if (data.listingError !== void 0 && (!data.listingError || typeof data.listingError !== "object" || Array.isArray(data.listingError) || typeof data.listingError.message !== "string" || typeof data.listingError.code !== "string")) throw new Error("交易上架响应不完整");
		if (data.receipt !== void 0) assertMarketMutationResult(data.receipt, "交易上架响应不完整");
	}
	if (body.action === "purchase") {
		if (data.preview !== void 0) assertMarketPurchasePreview(data.preview, "市场购买预览响应不完整");
		else assertMarketMutationResult(data.receipt, "选购响应不完整");
	}
	return data;
}
async function marketListingsView(bid, uid, page, request) {
	return parseMyMarketListings((await marketWorkflow(bid, uid, {
		action: "listings",
		page
	}, request)).listings);
}
async function marketCredibilityView(bid, uid, request) {
	return parseMarketCredibility((await marketWorkflow(bid, uid, { action: "credibility" }, request)).credibility);
}
async function robberyRecordsView(bid, uid, page, request) {
	return parseRobberyRecords(await requestBackend(identity(bid), "post_players_id_robbery_records_view", {
		path: { id: uid },
		body: { page },
		requestId: request?.requestId
	}));
}
async function glossaryView(bid, action, page = 1, keyword, category) {
	return parseGlossaryView(await requestBackend(identity(bid), "get_glossary_view", { query: {
		action,
		page,
		keyword,
		category
	} }), action);
}
async function glossaryEditContextCommand(bid, uid, request) {
	return parseGlossaryView(await requestBackend(identity(bid), "post_players_id_glossary_edit_context", {
		path: { id: uid },
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey,
		headers: repeatPresentationHeaders(request?.idempotencyKey ? "录入词典" : void 0)
	}), "edit_context");
}
function parseGlossaryView(data, action) {
	if (!data || typeof data !== "object" || !(data.exact === null || typeof data.exact === "object")) throw new Error("词典接口返回格式不完整");
	const policy = data.policy;
	if (policy && (!Array.isArray(policy.categories) || !policy.categories.every((value) => typeof value === "string") || typeof policy.defaultCategory !== "string" || !Number.isInteger(policy.keywordMaxLength) || !Number.isInteger(policy.contentMaxLength) || typeof policy.categoryValid !== "boolean")) throw new Error("词典策略响应不完整");
	const quota = data.quota;
	if (action === "edit_context" && (!quota || typeof quota.allowed !== "boolean" || typeof quota.withinLimit !== "boolean")) throw new Error("词典配额响应不完整");
	if (action !== "search" && action !== "edit_context" && !policy) throw new Error("词典策略响应不完整");
	if (action === "edit_context" && quota?.allowed && quota.withinLimit && !policy) throw new Error("词典策略响应不完整");
	const raw = data.page;
	if (raw && (!Array.isArray(raw.items) || raw.pageSize !== 5 || !Number.isSafeInteger(raw.total) || !Number.isSafeInteger(raw.page))) throw new Error("词典分页响应不完整");
	return {
		policy,
		quota,
		exact: data.exact === null ? null : parseGlossaryEntry(data.exact),
		page: raw ? {
			entries: raw.items.map(parseGlossaryEntry),
			total: raw.total,
			totalPages: Math.ceil(raw.total / raw.pageSize),
			currentPage: raw.page
		} : void 0
	};
}

//#endregion
export { glossaryEditContextCommand, glossaryView, marketCredibilityView, marketListingsView, marketWorkflow, parseGlossaryView, robberyRecordsView };