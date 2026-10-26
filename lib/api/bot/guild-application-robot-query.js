import { parseGuildApplicationCancel } from "./guild-application-cancel.js";
import { parseGuildApplications } from "./guild-application-queries.js";
import { parseGuildApplicationDecision } from "./guild-membership-mutations.js";

//#region src/api/bot/guild-application-robot-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门申请业务响应不完整");
	return value;
}
function parseRobotGuildApplicationCancel(value) {
	const row = record(value);
	if (row.outcome === "list") return {
		outcome: "list",
		pendingApps: parseGuildApplications(row.data).applications.map((app) => ({
			id: app.id,
			guildId: app.guildId,
			guildName: app.guildNameText,
			status: app.statusText
		}))
	};
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("宗门申请业务响应不完整");
	if (parseGuildApplicationCancel(row.receipt).outcome !== "cancelled") throw new Error("宗门申请业务响应不完整");
	return {
		outcome: "result",
		message: row.message
	};
}
function parseRobotGuildApplicationDecision(value) {
	const row = record(value);
	if (row.outcome === "no_target") return { outcome: "no_target" };
	if (row.outcome !== "result" || typeof row.message !== "string") throw new Error("宗门申请业务响应不完整");
	if (parseGuildApplicationDecision(row.receipt).outcome === "auto_rejected") throw new Error("宗门申请业务响应不完整");
	return {
		outcome: "result",
		message: row.message
	};
}

//#endregion
export { parseRobotGuildApplicationCancel, parseRobotGuildApplicationDecision };