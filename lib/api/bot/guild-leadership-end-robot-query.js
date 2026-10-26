import { parseGuildWorkflow } from "./guild-workflow.js";
import { parseGuildImpeach } from "./guild-impeach.js";

//#region src/api/bot/guild-leadership-end-robot-query.ts
function parseRobotGuildDissolve(value) {
	const data = parseGuildWorkflow({ action: "dissolve" }, 0, value);
	if (data.outcome === "not_joined") throw new Error("解散宗门响应不完整");
	return data;
}
function parseRobotGuildImpeach(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("弹劾响应不完整");
	const row = value;
	const data = parseGuildImpeach(row.receipt);
	if (typeof row.message !== "string") throw new Error("弹劾响应不完整");
	return {
		...data,
		message: row.message
	};
}

//#endregion
export { parseRobotGuildDissolve, parseRobotGuildImpeach };