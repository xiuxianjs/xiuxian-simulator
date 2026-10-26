import { requestBackend } from "../../api/bot/client.js";

//#region src/response-apps/activity/app.ts
function valid(x) {
	const v = x;
	return !!v && typeof v.limitedEvent?.activeCount === "number" && typeof v.guildCompetition?.phase === "string" && typeof v.guildSecretRealmWar?.phase === "string" && typeof v.tower?.isOpen === "boolean" && typeof v.tianjiao?.isVisible === "boolean" && typeof v.access?.hasGuild === "boolean";
}
async function App(params) {
	if (!params.uid || !params.bid) return { code: "INVALID_USER" };
	try {
		const data = await requestBackend(params.bid, "get_players_id_activity_hub", { path: { id: params.uid } });
		if (!valid(data)) throw new Error("活动总览响应不完整");
		return {
			code: "OK",
			data
		};
	} catch {
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };