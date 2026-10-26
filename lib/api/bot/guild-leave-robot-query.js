import { parseGuildMemberMutation } from "./guild-member-lifecycle.js";

//#region src/api/bot/guild-leave-robot-query.ts
function parseRobotGuildLeave(value) {
	const data = parseGuildMemberMutation(value);
	if (!["confirmation_required", "left"].includes(data.outcome)) throw new Error("退出宗门响应不完整");
	return data;
}
function parseRobotGuildLeaderLeave(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗主请假响应不完整");
	const row = value;
	const receipt = parseGuildMemberMutation(row.receipt);
	if (receipt.outcome !== "leave_granted" || typeof row.message !== "string") throw new Error("宗主请假响应不完整");
	return {
		receipt,
		message: row.message
	};
}

//#endregion
export { parseRobotGuildLeaderLeave, parseRobotGuildLeave };