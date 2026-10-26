import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/confirmation-preferences.ts
async function setBackendConfirmationPreference(bid, uid, action, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	if (action.type !== "CONFIRM_SPIRIT_CRYSTAL" && action.type !== "CONFIRM_DAO_CRYSTAL") throw new Error("不支持的购买确认设置");
	if (typeof action.threshold !== "number" || Number.isFinite(action.threshold) && (action.threshold < 0 || !Number.isInteger(action.threshold))) throw new Error("购买确认阈值参数无效");
	const context = writeContext(request);
	const value = Number.isFinite(action.threshold) ? action.threshold : null;
	let data;
	let field;
	if (action.type === "CONFIRM_SPIRIT_CRYSTAL") {
		field = "confirmSpiritCrystal";
		data = await requestBackend(bid, "patch_players_id_preferences_spirit_crystal_confirmation", {
			path: { id: uid },
			body: { confirmSpiritCrystal: value },
			...context
		});
	} else {
		field = "confirmDaoCrystal";
		data = await requestBackend(bid, "patch_players_id_preferences_dao_crystal_confirmation", {
			path: { id: uid },
			body: { confirmDaoCrystal: value },
			...context
		});
	}
	if (!data || typeof data !== "object" || Array.isArray(data) || data[field] !== value) throw new Error("购买确认阈值响应不完整");
	return action;
}

//#endregion
export { setBackendConfirmationPreference };