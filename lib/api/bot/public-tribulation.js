import { requestBackend } from "./client.js";
import { parsePublicTribulationEvent, parsePublicTribulationList } from "../schemas/public-tribulation.js";

//#region src/api/bot/public-tribulation.ts
async function listBackendPublicTribulations(bid, query) {
	if (!bid?.trim()) throw new Error("公开渡劫查询缺少平台身份");
	return parsePublicTribulationList(await requestBackend(bid, "get_tribulation_events", { query }));
}
async function observeBackendPublicTribulation(bid, eventId) {
	if (!bid?.trim() || !Number.isSafeInteger(eventId) || eventId <= 0) throw new Error("公开渡劫查询参数无效");
	return parsePublicTribulationEvent(await requestBackend(bid, "get_tribulation_events_eventId", { path: { eventId } }));
}

//#endregion
export { listBackendPublicTribulations, observeBackendPublicTribulation };