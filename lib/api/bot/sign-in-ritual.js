import { requestBackend } from "./client.js";

//#region src/api/bot/sign-in-ritual.ts
async function getBackendSignInRitualText(bid, uid, scope) {
	const data = await requestBackend(bid, "get_players_id_check_ins_ritual_scope", { path: {
		id: uid,
		scope
	} });
	if (!data || typeof data.ritualText !== "string" || !data.ritualText.trim()) throw new Error("签到寄语接口返回不完整");
	return data.ritualText;
}

//#endregion
export { getBackendSignInRitualText };