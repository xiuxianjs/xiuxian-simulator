import { parseGuildStipend } from "./guild-worship-stipend.js";
import { parseGuildMilestoneClaim, parseGuildMilestonesClaimAll } from "./guild-milestone-claim.js";

//#region src/api/bot/guild-claims-robot-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门领取响应不完整");
	return value;
}
function message(row) {
	if (typeof row.message !== "string" || !row.message) throw new Error("宗门领取响应不完整");
	return row.message;
}
function parseRobotGuildMilestoneClaim(value, milestoneId) {
	const row = record(value);
	if (row.outcome === "usage") return { message: "请指定奖励ID，例如：领取宗门日活奖励 1" };
	if (row.outcome !== "result") throw new Error("宗门领取响应不完整");
	parseGuildMilestoneClaim(row.receipt, milestoneId);
	return { message: message(row) };
}
const parseRobotGuildMilestonesClaimAll = parseGuildMilestonesClaimAll;
function parseRobotGuildStipend(value) {
	const row = record(value);
	parseGuildStipend(row.receipt);
	return { message: message(row) };
}

//#endregion
export { parseRobotGuildMilestoneClaim, parseRobotGuildMilestonesClaimAll, parseRobotGuildStipend };