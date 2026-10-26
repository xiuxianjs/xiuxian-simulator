import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/battle-template-delete.ts
async function deleteBackendBattleTemplate(bid, uid, slot, request) {
	if (!Number.isInteger(slot) || slot < 1 || slot > 5) throw new Error("模板槽位必须为 1-5 的整数");
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBattleTemplateDelete(await requestBackend(bid, "delete_players_id_battle_templates_slot", {
		path: {
			id: uid,
			slot
		},
		...context
	}));
}
function parseBattleTemplateDelete(value) {
	const data = value;
	if (typeof data?.deleted !== "boolean") throw new Error("删除战斗模板响应不完整");
	return data;
}

//#endregion
export { deleteBackendBattleTemplate, parseBattleTemplateDelete };