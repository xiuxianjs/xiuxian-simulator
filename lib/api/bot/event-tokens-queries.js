import { requestBackend } from "./client.js";

//#region src/api/bot/event-tokens-queries.ts
function text(value) {
	if (typeof value !== "string") throw new Error("活动道具接口缺少名称");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("活动道具接口缺少数值");
	return value;
}
async function getBackendEventTokens(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendEventTokens(await requestBackend(bid, "get_players_id_limited_events_tokens", { path: { id: uid } }));
}
function parseBackendEventTokens(data) {
	if (!Array.isArray(data)) throw new Error("活动道具接口缺少列表");
	return data.map((value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活动道具接口格式不完整");
		const row = value;
		return {
			eventId: number(row.eventId),
			eventTitle: text(row.eventTitle),
			paidTokenName: text(row.paidTokenName),
			freeTokenName: text(row.freeTokenName),
			paidToken: number(row.paidToken),
			freeToken: number(row.freeToken)
		};
	});
}

//#endregion
export { getBackendEventTokens, parseBackendEventTokens };