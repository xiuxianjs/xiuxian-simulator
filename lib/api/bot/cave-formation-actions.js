import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/cave-formation-actions.ts
function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isCategory(value) {
	return value === "concealment" || value === "stasis" || value === "yield" || value === "guard";
}
function isFormation(value) {
	return isObject(value) && typeof value.formationKey === "string" && isCategory(value.formationCategory) && typeof value.formationName === "string" && typeof value.formationEffect === "string" && typeof value.expiresAt === "string" && Number.isFinite(Date.parse(value.expiresAt));
}
function isActivateResult(value) {
	if (!isObject(value) || typeof value.outcome !== "string" || ![
		"created",
		"refreshed",
		"replaced"
	].includes(value.outcome) || typeof value.replaced !== "boolean") return false;
	if (value.replacedFormationName !== void 0 && value.replacedFormationName !== null && typeof value.replacedFormationName !== "string" || typeof value.name !== "string" || !Number.isFinite(value.durationHours) || !isFormation(value.formation)) return false;
	return value.outcome === "replaced" === value.replaced && (value.outcome !== "replaced" || typeof value.replacedFormationName === "string") && value.name === value.formation.formationName;
}
function isRemoveResult(value) {
	return isObject(value) && value.removed === true && value.outcome === "removed" && value.replaced === false && isCategory(value.category) && typeof value.name === "string" && Number.isFinite(value.durationHours) && isFormation(value.formation) && value.category === value.formation.formationCategory && value.name === value.formation.formationName;
}
function requireBid(bid) {
	if (!bid) throw new Error("操作缺少平台身份");
}
async function activateBackendCaveFormation(bid, uid, keyword, request) {
	requireBid(bid);
	return parseBackendCaveFormationActivation(await requestBackend(bid, "post_players_id_cave_formations_activate", {
		path: { id: uid },
		body: { keyword },
		...writeContext(request)
	}));
}
function parseBackendCaveFormationActivation(data) {
	if (!isActivateResult(data)) throw new Error("激活阵盘响应不完整");
	return data;
}
async function removeBackendCaveFormation(bid, uid, keyword, request) {
	requireBid(bid);
	return parseBackendCaveFormationRemoval(await requestBackend(bid, "delete_players_id_cave_formations_category", {
		path: {
			id: uid,
			category: keyword
		},
		...writeContext(request)
	}));
}
function parseBackendCaveFormationRemoval(data) {
	if (!isRemoveResult(data)) throw new Error("移除阵法响应不完整");
	return data;
}
function caveFormationKeyword(text, action) {
	return action === "activate" ? text.replace(/^(!|！|\/|#|＃)?激活阵盘\s*/, "").trim() : text.replace(/^(!|！|\/|#|＃)?移除阵法\s*/, "").trim();
}

//#endregion
export { activateBackendCaveFormation, caveFormationKeyword, parseBackendCaveFormationActivation, parseBackendCaveFormationRemoval, removeBackendCaveFormation };