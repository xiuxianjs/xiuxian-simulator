import { requestBackend } from "./client.js";

//#region src/api/bot/companion-tasks-queries.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const taskType = (value) => value === "dual_cultivation" || value === "dungeon" || value === "gift" || value === "care_farm";
async function getBackendCompanionTasks(bid, uid) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	return parseCompanionTasks(await requestBackend(bid, "get_players_id_companion_tasks", { path: { id: uid } }));
}
function parseCompanionTasks(data) {
	if (!record(data) || !record(data.access) || typeof data.access.canUseFifthLayerFeature !== "boolean" || data.access.realmName !== null && typeof data.access.realmName !== "string" || typeof data.hasCompanion !== "boolean" || !Array.isArray(data.tasks)) throw new Error("道侣任务数据不完整");
	const tasks = data.tasks.map((task) => {
		if (!record(task) || !taskType(task.taskType) || !integer(task.limit) || !integer(task.completedCount) || !integer(task.earnedTongxin) || !Array.isArray(task.rewardAmounts) || !task.rewardAmounts.every(integer)) throw new Error("道侣任务字段不完整");
		return {
			taskType: task.taskType,
			limit: task.limit,
			completedCount: task.completedCount,
			earnedTongxin: task.earnedTongxin,
			rewardAmounts: [...task.rewardAmounts]
		};
	});
	return {
		access: {
			canUseFifthLayerFeature: data.access.canUseFifthLayerFeature,
			realmName: data.access.realmName
		},
		hasCompanion: data.hasCompanion,
		tasks
	};
}

//#endregion
export { getBackendCompanionTasks, parseCompanionTasks };