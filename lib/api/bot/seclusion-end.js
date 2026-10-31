import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/seclusion-end.ts
async function endBackendSeclusion(bid, uid, request) {
	if (!bid?.trim()) throw new Error("返程请求缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid < 1) throw new Error("返程请求参数无效");
	return parseSeclusionEnd(await requestBackend(bid, "post_players_id_seclusion_end", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseSeclusionEnd(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("返程结算响应不完整");
	if (typeof data.interrupted !== "boolean" || typeof data.spiritRefunded !== "boolean" || typeof data.penaltyApplied !== "boolean" || !Number.isSafeInteger(data.settledHours)) throw new Error("返程结算响应不完整");
	if ("presenceText" in data && data.presenceText !== null && data.presenceText !== void 0 && typeof data.presenceText !== "string") throw new Error("返程结算响应的道侣在场文案无效");
	const view = data.view;
	if (data.creditedExperience !== void 0 && !Number.isSafeInteger(data.creditedExperience)) throw new Error("探索实际修为响应无效");
	if (data.refundedSpirit !== void 0 && (!Number.isSafeInteger(data.refundedSpirit) || data.refundedSpirit < 0)) throw new Error("返程精力响应无效");
	if (data.materialProgressPercent !== void 0 && (typeof data.materialProgressPercent !== "number" || !Number.isFinite(data.materialProgressPercent) || data.materialProgressPercent < 0 || data.materialProgressPercent >= 100)) throw new Error("秘境采集进度无效");
	if (data.gatheredMaterialCount !== void 0 && (!Number.isSafeInteger(data.gatheredMaterialCount) || data.gatheredMaterialCount < 0)) throw new Error("秘境采集数量无效");
	if (!view || typeof view !== "object" || Array.isArray(view) || ![
		"refunded",
		"interrupted",
		"completed"
	].includes(view.kind) || [
		"title",
		"introText",
		"penaltyText",
		"expBonusText"
	].some((field) => typeof view[field] !== "string") || [
		"pillCount",
		"rareDropTypeCount",
		"rareDropTotalCount"
	].some((field) => !Number.isSafeInteger(view[field]) || view[field] < 0) || [
		"showHuanHunDan",
		"showYangShenDan",
		"showRareDrops"
	].some((field) => typeof view[field] !== "boolean")) throw new Error("返程结算响应的展示信息无效");
	if (view.kind !== "refunded" && (!data.rewards || !Array.isArray(data.rewards.rareDrops))) throw new Error("返程结算响应的奖励信息无效");
	if (data.rewards !== void 0) {
		const rewards = data.rewards;
		if (!rewards || typeof rewards !== "object" || Array.isArray(rewards) || ![
			rewards.experience,
			rewards.spiritStone,
			rewards.huanHunDan,
			rewards.yangShenDan,
			rewards.soulDew
		].every(Number.isSafeInteger) || !Array.isArray(rewards.rareDrops) || rewards.rareDrops.some((drop) => !drop || typeof drop !== "object" || Array.isArray(drop) || typeof drop.name !== "string" || !Number.isSafeInteger(drop.quantity))) throw new Error("返程结算响应的奖励信息无效");
	}
	parseTreasureEffects(data.treasureEffects);
	parseNormalExperienceGained(data.normalExperienceGained);
	return data;
}

//#endregion
export { endBackendSeclusion, parseSeclusionEnd };