import { getEventAccessFacts } from "./access-facts.js";
import { requestBackend } from "./client.js";
import { isBattleTemplateSummary } from "../schemas/battle-templates-query.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/battle-templates-query.ts
async function getBackendBattleTemplateAccess(bid, uid) {
	try {
		if (!bid) throw new Error("操作缺少平台身份");
		const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;
		if (cached) return {
			ok: cached.canUseFifthLayerFeature,
			realmName: cached.realmNameValue ?? "未知"
		};
		const data = await requestBackend(bid, "get_players_id_social_access", { path: { id: uid } });
		if (typeof data?.canUseFifthLayerFeature !== "boolean" || data.realmNameValue !== null && typeof data.realmNameValue !== "string") throw new Error("战斗模板资格响应不完整");
		return {
			ok: data.canUseFifthLayerFeature,
			realmName: data.realmNameValue ?? "未知"
		};
	} catch {
		return {
			ok: false,
			realmName: "未知"
		};
	}
}
async function getBackendBattleTemplates(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBattleTemplates(await requestBackend(bid, "get_players_id_battle_templates", { path: { id: uid } }));
}
function parseBattleTemplates(value) {
	const data = value;
	if (!data || !Array.isArray(data.templates) || !data.templates.every(isBattleTemplateSummary) || !isBattleTemplateSummary(data.current)) throw new Error("战斗模板接口返回不完整");
	return data;
}

//#endregion
export { getBackendBattleTemplateAccess, getBackendBattleTemplates, parseBattleTemplates };