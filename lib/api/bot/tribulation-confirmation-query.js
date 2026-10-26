import { requestBackend, writeContext } from "./client.js";
import { parseTribulationConfirmation } from "../schemas/tribulation.js";

//#region src/api/bot/tribulation-confirmation-query.ts
async function confirmBackendTribulationQuery(bid, uid, eventId, grade, request) {
	if (!bid) throw new Error("渡劫操作参数无效");
	return parseTribulationConfirmationQuery(await requestBackend(bid, "post_players_id_tribulation_events_eventId_confirmation_query", {
		path: {
			id: uid,
			eventId
		},
		body: { grade },
		...writeContext(request)
	}));
}
function parseTribulationConfirmationQuery(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("渡劫确认聚合响应不完整");
	const value = data;
	if (!value.materialNames || typeof value.materialNames !== "object" || Array.isArray(value.materialNames)) throw new Error("渡劫材料名称响应不完整");
	const materialNames = {};
	for (const [key, name] of Object.entries(value.materialNames)) {
		if (!/^\d+$/.test(key) || !Number.isSafeInteger(Number(key)) || typeof name !== "string") throw new Error("渡劫材料名称无效");
		materialNames[Number(key)] = name;
	}
	return {
		confirmation: parseTribulationConfirmation(value.confirmation),
		materialNames
	};
}

//#endregion
export { confirmBackendTribulationQuery, parseTribulationConfirmationQuery };