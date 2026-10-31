import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/companion-relationship-actions.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣结算响应不完整");
	return value;
}
function mutation(value) {
	const data = row(value);
	if (typeof data.success !== "boolean" || typeof data.message !== "string") throw new Error("道侣结算响应不完整");
	return {
		success: data.success,
		message: data.message
	};
}
function parseBackendCompanionDualCultivation(value) {
	const data = row(value);
	if (typeof data.success !== "boolean" || typeof data.experienceGained !== "number" || !Number.isSafeInteger(data.experienceGained) || typeof data.tongxinGained !== "number" || !Number.isSafeInteger(data.tongxinGained) || typeof data.partnerId !== "number" || !Number.isSafeInteger(data.partnerId) || data.partnerId <= 0 || data.creditedExperience !== void 0 && !Number.isSafeInteger(data.creditedExperience) || data.partnerCreditedExperience !== void 0 && !Number.isSafeInteger(data.partnerCreditedExperience)) throw new Error("双修结算响应不完整");
	return {
		treasureEffects: parseTreasureEffects(data.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(data.normalExperienceGained),
		success: data.success,
		experienceGained: data.experienceGained,
		...data.creditedExperience === void 0 ? {} : { creditedExperience: data.creditedExperience },
		...data.partnerCreditedExperience === void 0 ? {} : { partnerCreditedExperience: data.partnerCreditedExperience },
		tongxinGained: data.tongxinGained,
		partnerId: data.partnerId
	};
}
function requireBid(bid, action) {
	if (!bid) throw new Error(`${action}缺少平台身份`);
	return bid;
}
async function breakupBackendCompanion(bid, uid, request) {
	const data = await requestBackend(requireBid(bid, "解除道侣"), "delete_players_id_companion", {
		path: { id: uid },
		...writeContext(request)
	});
	const result = mutation(data);
	const narrativeText = row(data).narrativeText;
	if (typeof narrativeText !== "string" || !narrativeText.trim()) throw new Error("解除道侣响应缺少服务端叙事");
	return {
		...result,
		narrativeText
	};
}
async function upgradeBackendCompanionOath(bid, uid, request) {
	return mutation(await requestBackend(requireBid(bid, "升级誓约"), "post_players_id_companion_oath_upgrade", {
		path: { id: uid },
		...writeContext(request)
	}));
}
async function dualCultivateBackendCompanion(bid, uid, request, repeatCommand) {
	return parseBackendCompanionDualCultivation(await requestBackend(requireBid(bid, "双修"), "post_players_id_companion_dual_cultivation", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		...writeContext(request)
	}));
}

//#endregion
export { breakupBackendCompanion, dualCultivateBackendCompanion, parseBackendCompanionDualCultivation, upgradeBackendCompanionOath };