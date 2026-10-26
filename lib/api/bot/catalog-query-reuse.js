import { getBackendConfig } from "./config.js";
import { createBackendRequestContext, getEventTransportDiagnosticContext } from "./context.js";
import { fromCurrencyCN } from "../../constants/currency.js";
import { logger } from "alemonjs";

//#region src/api/bot/catalog-query-reuse.ts
const importers = /* @__PURE__ */ new WeakMap();
const eventSignature = (event) => JSON.stringify([
	event.UserId,
	event.MessageId,
	event.InteractionId,
	event.MessageText
]);
const snapshots = /* @__PURE__ */ new WeakMap();
const shopCodes = {
	万宝楼: "WANBAOLOU",
	签到: "CHECKIN",
	签到商店: "CHECKIN",
	积分: "TOWER_SCORE",
	积分商店: "TOWER_SCORE",
	道侣: "DAOLV",
	道侣商店: "DAOLV",
	神奇: "SHENQI",
	神奇商店: "SHENQI",
	声望: "REPUTATION",
	声望商店: "REPUTATION"
};
function parseStorylineListArgs(text) {
	const match = text.trim().match(/^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+(\d+))|(?:\s+p(\d+)))?$/);
	return {
		chapterArg: match?.[3] ? Number(match[3]) : null,
		pageArg: match?.[4] ? Number(match[4]) : null
	};
}
function parseShopListArgs(text, defaultShopCode) {
	const cleaned = defaultShopCode ? text.trim() : text.replace(/^(!|！|\/|#|＃)?商店\s*/, "").trim();
	const tokens = cleaned.split(/\s+/).filter(Boolean);
	let shopCode = defaultShopCode;
	let page = 1;
	for (const token of tokens) {
		if (!shopCode && shopCodes[token]) {
			shopCode = shopCodes[token];
			continue;
		}
		if (/^\d+$/.test(token)) page = Math.max(1, Number(token));
	}
	const cnMatch = cleaned.match(/(灵石|灵晶|道晶)/);
	const currencyCode = cnMatch ? fromCurrencyCN(cnMatch[1]) : void 0;
	if (!shopCode && currencyCode) shopCode = "WANBAOLOU";
	return {
		shopCode,
		page,
		currencyCode
	};
}
function withCommandCatalog(kind, importer) {
	importers.set(importer, kind);
	return importer;
}
function getRegisteredCommandCatalog(values) {
	const kinds = [...new Set(values.map((value) => importers.get(value)).filter((value) => value !== void 0))];
	return kinds.length === 1 ? kinds[0] : void 0;
}
function catalogRequestFromMessage(text, kind) {
	if (kind === "storyline" && /^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+\d+)|(?:\s+p\d+))?$/.test(text.trim())) {
		const { chapterArg, pageArg } = parseStorylineListArgs(text);
		const page = Math.max(1, pageArg ?? 1);
		if (Number.isSafeInteger(page) && (chapterArg === null || Number.isSafeInteger(chapterArg))) return {
			kind,
			args: {
				chapterNumber: chapterArg,
				page
			}
		};
	} else if (kind === "shop" && /^(!|！|\/|#|＃)?商店(?:\s|$)/.test(text.trim())) {
		if (/(?:^|\s)(筛选|搜索|可购|全部状态|默认排序|价格升序|价格降序)(?:\s|$)/.test(text)) return;
		const { page, shopCode, currencyCode } = parseShopListArgs(text.trim());
		if (Number.isSafeInteger(page)) return {
			kind,
			args: {
				page,
				shopCode: shopCode ?? null,
				currencyCode: currencyCode ?? null
			}
		};
	}
}
function sameRequest(value, expected) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const row = value;
	if (row.kind !== expected.kind || !row.args || typeof row.args !== "object" || Array.isArray(row.args)) return false;
	const args = row.args;
	const keys = Object.keys(expected.args);
	return Object.keys(args).length === keys.length && keys.every((key) => args[key] === expected.args[key]);
}
function seedEventCatalog(event, bid, uid, request, value) {
	invalidateEventCatalog(event);
	if (!value || typeof value !== "object" || Array.isArray(value) || event.UserId !== bid || !Number.isSafeInteger(uid) || uid < 1) return;
	const catalog = value;
	if (catalog.bid === bid && catalog.playerId === uid && sameRequest(catalog, request) && catalog.data !== void 0) snapshots.set(event, {
		bid,
		uid,
		signature: eventSignature(event),
		request,
		data: catalog.data
	});
}
function getEventCatalog(event, bid, uid, request) {
	if (!event || event.UserId !== bid) return;
	const saved = snapshots.get(event);
	if (saved?.bid === bid && saved.uid === uid && saved.signature === eventSignature(event) && sameRequest(saved.request, request)) return saved.data;
}
function invalidateEventCatalog(event) {
	snapshots.delete(event);
}
function reportCatalogReuse(event, kind, reason) {
	try {
		const config = getBackendConfig();
		if (!event || !config.logApiTimings && !config.logTransportTimings) return;
		logger.info("[目录复用]", {
			...getEventTransportDiagnosticContext(event),
			requestId: createBackendRequestContext(event).requestId,
			kind,
			outcome: reason ? "fallback" : "reused",
			...reason ? { reason } : {}
		});
	} catch {}
}

//#endregion
export { catalogRequestFromMessage, getEventCatalog, getRegisteredCommandCatalog, invalidateEventCatalog, parseShopListArgs, parseStorylineListArgs, reportCatalogReuse, seedEventCatalog, withCommandCatalog };