import { requestBackend } from "./client.js";
import { parseLimitedEventRewardFields, parseLimitedEventRewardNames } from "./limited-event-reward-parser.js";

//#region src/api/bot/event-tasks-queries.ts
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活动任务接口不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("活动任务接口缺少文本");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("活动任务接口缺少数值");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("活动任务接口缺少状态");
	return value;
}
function textParts(value) {
	if (!Array.isArray(value) || value.some((part) => typeof part !== "string")) throw new Error("活动任务接口缺少奖励描述");
	return value;
}
async function getBackendEventTasks(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendEventTasks(await requestBackend(bid, "get_players_id_limited_events_tasks", { path: { id: uid } }));
}
function parseBackendEventTasks(data) {
	if (!Array.isArray(data)) throw new Error("活动任务接口缺少列表");
	return data.map((value) => {
		const group = object(value);
		if (!Array.isArray(group.tasks)) throw new Error("活动任务接口缺少任务");
		return {
			eventTitle: text(group.eventTitle),
			subTitle: text(group.subTitle),
			paidTokenName: text(group.paidTokenName),
			freeTokenName: text(group.freeTokenName),
			rewardNames: parseLimitedEventRewardNames(group.rewardNames),
			tasks: group.tasks.map((value) => {
				const row = object(value);
				return {
					taskId: number(row.taskId),
					taskName: text(row.taskName),
					taskDescription: text(row.taskDescription),
					targetValue: number(row.targetValue),
					currentValue: number(row.currentValue),
					completed: boolean(row.completed),
					claimed: boolean(row.claimed),
					canClaim: boolean(row.canClaim),
					rewardTextParts: textParts(row.rewardTextParts),
					rewardFields: parseLimitedEventRewardFields(row.rewardFields)
				};
			})
		};
	});
}

//#endregion
export { getBackendEventTasks, parseBackendEventTasks };