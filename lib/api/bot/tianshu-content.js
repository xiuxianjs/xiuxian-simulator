import { requestBackend } from "./client.js";

//#region src/api/bot/tianshu-content.ts
const isStage = (value) => {
	if (!value || typeof value !== "object") return false;
	const stage = value;
	return Number.isInteger(stage.stageLevel) && Number(stage.stageLevel) >= 0 && typeof stage.stageName === "string" && (stage.realmName === void 0 || typeof stage.realmName === "string") && Array.isArray(stage.unlocks) && stage.unlocks.every((row) => row && typeof row === "object" && typeof row.realm === "string" && Array.isArray(row.features) && row.features.every((feature) => typeof feature === "string") && (row.unlocked === void 0 || typeof row.unlocked === "boolean"));
};
async function getBackendTianshuContent(bid) {
	if (!bid) throw new Error("天书查询缺少平台身份");
	return parseBackendTianshuContent(await requestBackend(bid, "get_content_tianshu"));
}
function parseBackendTianshuContent(data) {
	if (!data || typeof data !== "object") throw new Error("天书接口数据不完整");
	const content = data;
	if (content.gateVersion !== void 0 && content.gateVersion !== 1 || content.commandFeatures !== void 0 && (!content.commandFeatures || typeof content.commandFeatures !== "object" || Array.isArray(content.commandFeatures) || !Object.entries(content.commandFeatures).every(([key, value]) => key.trim() !== "" && typeof value === "string" && value !== "")) || content.featureCatalog !== void 0 && (!Array.isArray(content.featureCatalog) || !content.featureCatalog.every((group) => group && Number.isInteger(group.stageLevel) && group.stageLevel >= 0 && typeof group.stageName === "string" && Array.isArray(group.features) && group.features.every((feature) => feature && typeof feature.id === "string" && typeof feature.name === "string" && typeof feature.description === "string" && typeof feature.realm === "string" && typeof feature.realmReached === "boolean" && typeof feature.visible === "boolean" && Array.isArray(feature.conditions) && feature.conditions.every((condition) => typeof condition === "string")))) || typeof content.intro !== "string" || !Array.isArray(content.realmUnlocks) || !content.realmUnlocks.every((row) => row && typeof row === "object" && typeof row.realm === "string" && Array.isArray(row.features) && row.features.every((feature) => typeof feature === "string")) || !Array.isArray(content.notes) || !content.notes.every((note) => typeof note === "string") || content.currentStage !== void 0 && !isStage(content.currentStage) || content.nextStage !== void 0 && !isStage(content.nextStage)) throw new Error("天书接口数据不完整");
	return content;
}
function parseFeatureAccess(value) {
	if (value === void 0) return {};
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("功能开放条件不完整");
	const out = {};
	for (const [key, raw] of Object.entries(value)) {
		const row = raw;
		if (!row || typeof row.realmReached !== "boolean" || typeof row.requiredRealm !== "string" || typeof row.lockedReason !== "string") throw new Error("功能开放条件不完整");
		out[key] = row;
	}
	return out;
}
/** Compact, server-evaluated state; static command rules are loaded at startup. */
async function getBackendPresentationAccess(bid) {
	const raw = await requestBackend(bid, "get_content_tianshu", { query: { view: "access" } });
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		const value = raw;
		if (value.gateVersion === 1 && value.features && typeof value.features === "object" && !Array.isArray(value.features) && Object.values(value.features).every((reached) => typeof reached === "boolean")) return value.features;
	}
	const content = parseBackendTianshuContent(raw);
	if (content.gateVersion !== 1 || !content.featureCatalog) throw new Error("功能状态不完整");
	return Object.fromEntries(content.featureCatalog.flatMap((group) => group.features.map((feature) => [feature.id, feature.realmReached && feature.visible])));
}

//#endregion
export { getBackendPresentationAccess, getBackendTianshuContent, parseBackendTianshuContent, parseFeatureAccess };