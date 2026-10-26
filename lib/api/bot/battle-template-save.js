import { requestBackend, writeContext } from "./client.js";
import { isBattleTemplateSummary } from "../schemas/battle-templates-query.js";

//#region src/api/bot/battle-template-save.ts
async function saveBackendBattleTemplate(bid, uid, slot, name, request) {
	if (!Number.isInteger(slot) || slot < 1 || slot > 5) throw new Error("模板槽位必须为 1-5 的整数");
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBattleTemplateSave(await requestBackend(bid, "post_players_id_battle_templates_slot_snapshot", {
		path: {
			id: uid,
			slot
		},
		body: name === void 0 ? {} : { name },
		...context
	}), slot);
}
function parseBattleTemplateSave(value, slot) {
	const data = value;
	if (!isBattleTemplateSummary(data) || data.slot !== slot || typeof data.created !== "boolean") throw new Error("保存战斗模板响应不完整");
	return data;
}

//#endregion
export { parseBattleTemplateSave, saveBackendBattleTemplate };