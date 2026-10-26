import { requestBackend } from "./client.js";

//#region src/api/bot/guild-weekly-task-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门周常数据不完整");
	return value;
}
function finite(value) {
	return typeof value === "number" && Number.isFinite(value);
}
async function getBackendGuildWeeklyTask(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildWeeklyTask(record(await requestBackend(bid, "get_players_id_guild_tasks_type", { path: {
		id: uid,
		type: "weekly"
	} })));
}
function parseGuildWeeklyTask(value) {
	const data = record(value);
	if (typeof data.guildName !== "string" || ![
		"guildId",
		"contributionPoints",
		"weeklyActivity",
		"weeklyActivityMax",
		"stipendThreshold",
		"stipendPreviewAmount",
		"stipendBaseAmount",
		"stipendGuildLevel",
		"weeklyCheckinCount",
		"weeklyMiningCount",
		"weeklyExchangeCount"
	].every((key) => Number.isSafeInteger(data[key])) || !["stipendLevelMultiplier", "stipendActivityMultiplier"].every((key) => finite(data[key])) || !Array.isArray(data.milestones) || !Array.isArray(data.weeklyTasks) || typeof data.claimAllAvailable !== "boolean") throw new Error("宗门周常数据不完整");
	const taskKeys = [
		"checkin",
		"mining",
		"exchange"
	];
	if (data.weeklyTasks.length !== taskKeys.length) throw new Error("宗门周常任务数据不完整");
	for (const [index, item] of data.weeklyTasks.entries()) {
		const task = record(item);
		if (task.key !== taskKeys[index] || typeof task.label !== "string" || !Number.isSafeInteger(task.progress) || !Number.isSafeInteger(task.target) || typeof task.unit !== "string" || !Number.isSafeInteger(task.activityReward) || typeof task.bonusText !== "string" || typeof task.completed !== "boolean") throw new Error("宗门周常任务数据不完整");
	}
	for (const item of data.milestones) {
		const milestone = record(item);
		if (!Number.isSafeInteger(milestone.id) || !Number.isSafeInteger(milestone.threshold) || milestone.description !== null && typeof milestone.description !== "string" || typeof milestone.claimed !== "boolean" || typeof milestone.canClaim !== "boolean") throw new Error("宗门周常里程碑数据不完整");
	}
	return data;
}

//#endregion
export { getBackendGuildWeeklyTask, parseGuildWeeklyTask };