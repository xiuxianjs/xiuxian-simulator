import { parseGuildCheckin } from "./guild-checkin.js";
import { parseGuildDailyTask } from "./guild-daily-task-query.js";
import { parseGuildWeeklyTask } from "./guild-weekly-task-query.js";

//#region src/api/bot/guild-daily-robot-query.ts
function parseRobotGuildCheckin(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门签到响应不完整");
	const row = value;
	parseGuildCheckin(row.receipt);
	if (typeof row.message !== "string" || !row.message) throw new Error("宗门签到响应不完整");
	return {
		code: "OK",
		data: { message: row.message }
	};
}
const parseRobotGuildDaily = (value) => ({
	code: "OK",
	data: parseGuildDailyTask(value)
});
const parseRobotGuildWeekly = (value) => presentGuildWeekly(parseGuildWeeklyTask(value));
function presentGuildWeekly(result) {
	return {
		code: "OK",
		data: {
			guildName: result.guildName || "未知宗门",
			contributionPoints: result.contributionPoints,
			weeklyActivity: result.weeklyActivity,
			weeklyActivityMax: result.weeklyActivityMax,
			stipendThreshold: result.stipendThreshold,
			stipendPreviewAmount: result.stipendPreviewAmount,
			stipendBaseAmount: result.stipendBaseAmount,
			stipendGuildLevel: result.stipendGuildLevel,
			stipendLevelMultiplier: result.stipendLevelMultiplier,
			stipendActivityMultiplier: result.stipendActivityMultiplier,
			weeklyCheckinCount: result.weeklyCheckinCount,
			weeklyMiningCount: result.weeklyMiningCount,
			weeklyExchangeCount: result.weeklyExchangeCount,
			weeklyTasks: result.weeklyTasks,
			claimAllAvailable: result.claimAllAvailable,
			milestones: result.milestones.map((milestone) => ({
				...milestone,
				description: milestone.description ?? ""
			}))
		}
	};
}

//#endregion
export { parseRobotGuildCheckin, parseRobotGuildDaily, parseRobotGuildWeekly, presentGuildWeekly };