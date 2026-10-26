import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseGachaCatalog, parseGachaGoods, parseGachaHistory } from "./queries.js";
import { parseCompanionInfo } from "./companion-info-queries.js";
import { parseCompanionProposalPreflight } from "./companion-proposal-preflight.js";
import { decodeShopPreview } from "./shop-purchase.js";
import { parseGachaPullResult } from "./gacha-pull.js";

//#region src/api/bot/interaction-overview.ts
const record = (v) => {
	if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("业务聚合响应不完整");
	return v;
};
const identity = (bid) => {
	if (!bid) throw new Error("请求缺少平台身份");
	return bid;
};
const mutation = (v) => {
	const data = record(v);
	if (typeof data.success !== "boolean" || typeof data.message !== "string") throw new Error("道侣操作响应不完整");
	return {
		success: data.success,
		message: data.message,
		narrativeText: typeof data.narrativeText === "string" ? data.narrativeText : ""
	};
};
async function actBackendCompanionProposalByName(bid, uid, name, action, request, repeatCommand) {
	return mutation(await requestBackend(identity(bid), "post_players_id_companion_proposals_by_name_action", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: {
			id: uid,
			action
		},
		body: { name },
		...writeContext(request)
	}));
}
async function confirmBackendCompanionOverview(bid, uid, action, request, repeatCommand) {
	const data = await requestBackend(identity(bid), "post_players_id_companion_confirmation_action", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: {
			id: uid,
			action
		},
		...writeContext(request)
	});
	const info = parseCompanionInfo(data.info);
	if (data.preview !== null && (!data.preview || typeof data.preview.partnerName !== "string" || ![
		data.preview.partnerId,
		data.preview.currentBlessingPercent,
		data.preview.upgradedBlessingPercent
	].every(Number.isFinite))) throw new Error("誓约升级预览数据不完整");
	if (data.mutationError !== void 0 && typeof data.mutationError !== "string") throw new Error("道侣操作响应不完整");
	return {
		info,
		preview: data.preview,
		mutation: data.mutation === null ? null : mutation(data.mutation),
		mutationError: data.mutationError
	};
}
async function proposeBackendCompanionOverview(bid, uid, targetUserId, oathItemId, request) {
	const data = record(await requestBackend(identity(bid), "post_players_id_companion_proposals_overview", {
		path: { id: uid },
		body: {
			targetUserId,
			oathItemId
		},
		...writeContext(request)
	}));
	if (typeof data.initiatorName !== "string" || data.projectionError !== void 0 && typeof data.projectionError !== "string") throw new Error("道侣申请响应不完整");
	if (data.projectionError) throw new Error(data.projectionError);
	return {
		...mutation(data.mutation),
		initiatorName: data.initiatorName
	};
}
async function getBackendNamedGacha(bid, uid, poolName, view, count, request) {
	return parseNamedGacha(view === "pull" ? await requestBackend(identity(bid), "post_players_id_gacha_named_poolName_pull", {
		path: {
			id: uid,
			poolName
		},
		body: { count: count ?? 1 },
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}) : await requestBackend(identity(bid), "get_players_id_gacha_named_poolName_view", { path: {
		id: uid,
		poolName,
		view
	} }), view);
}
function parseNamedGacha(raw, view) {
	const data = record(raw);
	const catalog = parseGachaCatalog(record(data.catalog));
	return {
		banner: catalog.accessStatus === "READY" ? {
			ok: true,
			banner: catalog
		} : catalog.accessStatus === "NO_BANNER" ? {
			ok: false,
			reason: "no_banner"
		} : {
			ok: false,
			reason: "realm_low",
			minRealmName: catalog.minRealm?.name ?? ""
		},
		goods: data.data !== null && view === "goods" ? parseGachaGoods(data.data) : [],
		history: data.data !== null && view === "history" ? parseGachaHistory(data.data) : [],
		pull: data.data !== null && view === "pull" ? parseGachaPullResult(data.data) : null
	};
}
const purchaseResult = (v) => {
	const data = record(v);
	if (typeof data.name !== "string" || typeof data.paid !== "string" || ![data.granted, data.buyCount].every(Number.isFinite)) throw new Error("商店结算响应不完整");
	return data;
};
async function purchaseBackendShopOverview(bid, uid, productId, count, confirmed, request) {
	return parseShopPurchaseOverview(await requestBackend(identity(bid), "post_players_id_shop_purchases_overview", {
		path: { id: uid },
		body: {
			productId,
			count,
			confirmed
		},
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}));
}
function parseShopPurchaseOverview(value) {
	const data = record(value);
	if (data.purchaseError !== void 0 && typeof data.purchaseError !== "string") throw new Error("商店结算响应不完整");
	return {
		preview: decodeShopPreview(data.preview),
		result: data.result === null ? null : purchaseResult(data.result),
		purchaseError: data.purchaseError,
		checkinAlternative: data.checkinAlternative === null || data.checkinAlternative === void 0 ? void 0 : decodeShopPreview(data.checkinAlternative)
	};
}
async function purchaseBackendCompanionShopOverview(bid, uid, productId, count, request, repeatCommand) {
	const data = await requestBackend(identity(bid), "post_players_id_companion_shop_purchases_overview", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: {
			productId,
			count
		},
		...writeContext(request)
	});
	if (!data.preview || typeof data.preview.name !== "string" || ![
		data.preview.productId,
		data.preview.unitPrice,
		data.preview.totalPrice,
		data.preview.grantQuantity,
		data.preview.count
	].every(Number.isFinite)) throw new Error("道侣商店预检响应不完整");
	if (data.purchaseError !== void 0 && typeof data.purchaseError !== "string") throw new Error("商店结算响应不完整");
	return {
		preview: data.preview,
		result: data.result === null ? null : purchaseResult(data.result),
		purchaseError: data.purchaseError
	};
}
async function executeBackendCompanionProposalCommand(bid, uid, input, request) {
	return parseCompanionProposalCommand(record(await requestBackend(identity(bid), "post_players_id_companion_proposals_command", {
		path: { id: uid },
		body: input,
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	})));
}
function parseCompanionProposalCommand(value) {
	const data = record(value);
	if (typeof data.code !== "string" || ![
		"NOT_FOUND",
		"NO_OATH_ITEMS",
		"INDEX_INVALID",
		"SELECTION_REQUIRED",
		"COMPLETED"
	].includes(data.code) || data.mutationError !== void 0 && typeof data.mutationError !== "string") throw new Error("道侣申请响应不完整");
	const preflight = parseCompanionProposalPreflight(data.preflight);
	const result = data.result === null ? null : record(data.result);
	if (result && (typeof result.initiatorName !== "string" || result.projectionError !== void 0 && typeof result.projectionError !== "string")) throw new Error("道侣申请响应不完整");
	return {
		code: data.code,
		preflight,
		result: result ? {
			...mutation(result.mutation),
			initiatorName: result.initiatorName
		} : null,
		mutationError: data.mutationError ?? result?.projectionError
	};
}

//#endregion
export { actBackendCompanionProposalByName, confirmBackendCompanionOverview, executeBackendCompanionProposalCommand, getBackendNamedGacha, parseCompanionProposalCommand, parseNamedGacha, parseShopPurchaseOverview, proposeBackendCompanionOverview, purchaseBackendCompanionShopOverview, purchaseBackendShopOverview };