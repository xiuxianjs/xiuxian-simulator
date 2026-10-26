import { requestBackend } from "./client.js";

//#region src/api/bot/activity-points-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("活跃度数据不完整");
	return value;
}
function numbers(row, keys) {
	return keys.every((key) => typeof row[key] === "number" && Number.isFinite(row[key]));
}
function texts(row, keys) {
	return keys.every((key) => typeof row[key] === "string");
}
function parseBackendActivityPoints(value, type) {
	const row = record(value);
	if (row.rewardType !== type || row.taskRewardsCanClaim !== void 0 && typeof row.taskRewardsCanClaim !== "boolean" || typeof row.cyclePeriod !== "string" || !numbers(row, ["currentPoints"]) || !Array.isArray(row.tasks) || !Array.isArray(row.rewards)) throw new Error("活跃度数据不完整");
	for (const value of row.tasks) {
		const task = record(value);
		if (!numbers(task, [
			"taskId",
			"activityPoints",
			"targetValue",
			"currentValue",
			"rewardQuantity"
		]) || !texts(task, [
			"name",
			"description",
			"actionKey",
			"rewardName"
		]) || typeof task.completed !== "boolean") throw new Error("活跃任务数据不完整");
	}
	for (const value of row.rewards) {
		const reward = record(value);
		if (!numbers(reward, [
			"requiredPoints",
			"quantity",
			"itemId"
		]) || !texts(reward, [
			"name",
			"category",
			"currencyCode"
		]) || typeof reward.claimed !== "boolean" || typeof reward.canClaim !== "boolean") throw new Error("活跃奖励数据不完整");
	}
	return row;
}
async function getBackendActivityPoints(bid, uid, type) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendActivityPoints(await requestBackend(bid, "get_players_id_activities_rewardType", { path: {
		id: uid,
		rewardType: type
	} }), type);
}

//#endregion
export { getBackendActivityPoints, parseBackendActivityPoints };