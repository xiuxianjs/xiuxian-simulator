import { requestBackend } from "./client.js";

//#region src/api/bot/companion-info-queries.ts
async function getBackendCompanionInfo(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompanionInfo(await requestBackend(bid, "get_players_id_companion", { path: { id: uid } }));
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣接口数据不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("道侣接口数据不完整");
	return value;
}
function nullableText(value) {
	return value === null ? null : text(value);
}
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("道侣接口数据不完整");
	return value;
}
function parseCompanionInfo(value) {
	const row = record(value);
	const access = record(row.access);
	if (typeof access.canUseFifthLayerFeature !== "boolean") throw new Error("道侣接口数据不完整");
	const result = {
		access: {
			canUseFifthLayerFeature: access.canUseFifthLayerFeature,
			realmName: nullableText(access.realmName)
		},
		noCompanionMessage: nullableText(row.noCompanionMessage),
		companion: null
	};
	if (row.companion !== null) {
		const p = record(row.companion);
		if (p.oathType !== "normal" && p.oathType !== "advanced") throw new Error("道侣接口数据不完整");
		const partnerId = integer(p.partnerId);
		if (partnerId < 0) throw new Error("道侣接口数据不完整");
		result.companion = {
			partnerId,
			partnerName: nullableText(p.partnerName),
			partnerRealm: nullableText(p.partnerRealm),
			displayPartnerName: text(p.displayPartnerName),
			displayPartnerRealm: text(p.displayPartnerRealm),
			intimacy: integer(p.intimacy),
			spiritBondLevel: text(p.spiritBondLevel),
			tongxin: integer(p.tongxin),
			oathType: p.oathType,
			blessingPercent: integer(p.blessingPercent),
			dualCultivationExp: integer(p.dualCultivationExp),
			dailyDualCultivationUsed: integer(p.dailyDualCultivationUsed),
			dailyDungeonUsed: integer(p.dailyDungeonUsed),
			dailyGiftUsed: integer(p.dailyGiftUsed),
			companionSince: nullableText(p.companionSince),
			companionMessage: text(p.companionMessage),
			anniversaryMessage: nullableText(p.anniversaryMessage)
		};
	}
	return result;
}

//#endregion
export { getBackendCompanionInfo, parseCompanionInfo };