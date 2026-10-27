import { formatGameTime } from "../../utils/gameTime.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/event-overview-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活动总览数据不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("活动总览文本不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("活动总览数值不完整");
	return value;
}
function date(value) {
	const raw = text(value);
	if (!Number.isFinite(new Date(raw).getTime())) throw new Error("活动总览时间不完整");
	return formatGameTime(raw);
}
async function getBackendEventOverview(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendEventOverview(await requestBackend(bid, "get_players_id_limited_events", { path: { id: uid } }));
}
function parseBackendEventOverview(data) {
	if (!Array.isArray(data)) throw new Error("活动总览列表不完整");
	return data.map((value) => {
		const row = record(value);
		if (!Array.isArray(row.subActivities)) throw new Error("活动阶段不完整");
		return {
			eventId: number(row.eventId),
			eventTitle: text(row.eventTitle),
			description: row.description === null ? "" : text(row.description),
			startTime: date(row.startTime),
			endTime: date(row.endTime),
			paidTokenName: text(row.paidTokenName),
			freeTokenName: text(row.freeTokenName),
			paidToken: number(row.paidToken),
			freeToken: number(row.freeToken),
			subActivities: row.subActivities.map((value) => {
				const sub = record(value);
				number(sub.id);
				if (typeof sub.isActive !== "boolean") throw new Error("活动阶段状态不完整");
				return {
					subTitle: text(sub.title),
					startTime: date(sub.startTime),
					endTime: date(sub.endTime),
					isActive: sub.isActive
				};
			})
		};
	});
}

//#endregion
export { getBackendEventOverview, parseBackendEventOverview };