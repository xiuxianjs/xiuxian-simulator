import { parseGuildWorkflow } from "./guild-workflow.js";
import { parseGuildRename } from "./guild-rename.js";

//#region src/api/bot/guild-settings-robot-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门设置响应不完整");
	return value;
}
function parseRobotGuildSetting(value, action) {
	const row = record(value);
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result" || typeof row.message !== "string" || !row.message) throw new Error("宗门设置响应不完整");
	if ((action === "rename" ? parseGuildRename(row.receipt) : parseGuildWorkflow({
		action: "min_realm",
		searchTerm: ""
	}, 0, row.receipt)).outcome !== (action === "rename" ? "renamed" : "updated")) throw new Error("宗门设置响应不完整");
	return {
		outcome: "result",
		message: row.message
	};
}

//#endregion
export { parseRobotGuildSetting };