import { requestBackend } from "./client.js";

//#region src/api/bot/guild-daily-task-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门日常数据不完整");
	return value;
}
function integer(value) {
	return typeof value === "number" && Number.isSafeInteger(value);
}
async function getBackendGuildDailyTask(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildDailyTask(record(await requestBackend(bid, "get_players_id_guild_tasks_type", { path: {
		id: uid,
		type: "daily"
	} })));
}
function parseGuildDailyTask(value) {
	const data = record(value);
	if (typeof data.guildName !== "string" || typeof data.miningText !== "string" || ![
		"guildId",
		"contributionPoints",
		"dailyActivity",
		"dailyActivityMax",
		"dailyMiningCount",
		"dailyExchangeCount",
		"prestigeRemaining"
	].every((key) => integer(data[key])) || ![
		"checkinDone",
		"dailyWorshipDone",
		"dailyStorylineDone"
	].every((key) => typeof data[key] === "boolean") || typeof data.claimAllAvailable !== "boolean" || !Array.isArray(data.dailyTasks) || !Array.isArray(data.milestones)) throw new Error("宗门日常数据不完整");
	const taskKeys = [
		"checkin",
		"mining",
		"exchange",
		"worship",
		"storyline"
	];
	if (data.dailyTasks.length !== taskKeys.length) throw new Error("宗门日常任务数据不完整");
	for (const [index, value] of data.dailyTasks.entries()) {
		const task = record(value);
		if (task.key !== taskKeys[index] || typeof task.line !== "string" || typeof task.actionAvailable !== "boolean" || typeof task.actionLabel !== "string") throw new Error("宗门日常任务数据不完整");
	}
	const milestones = data.milestones.map((value) => {
		const item = record(value);
		if (!integer(item.id) || !integer(item.threshold) || item.description !== null && typeof item.description !== "string" || typeof item.claimed !== "boolean" || typeof item.canClaim !== "boolean") throw new Error("宗门日常里程碑数据不完整");
		return {
			id: item.id,
			threshold: item.threshold,
			description: item.description ?? "",
			claimed: item.claimed,
			canClaim: item.canClaim
		};
	});
	return {
		...data,
		milestones
	};
}

//#endregion
export { getBackendGuildDailyTask, parseGuildDailyTask };