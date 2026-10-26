import { parseGuildWorkflow } from "./guild-workflow.js";

//#region src/api/bot/guild-content-action-robot-query.ts
function parseRobotGuildContentAction(value, action) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门业务响应不完整");
	const row = value;
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result" || typeof row.message !== "string" || !row.message) throw new Error("宗门业务响应不完整");
	const receipt = action === "essence-add" ? parseGuildWorkflow({
		action: "essence_add",
		content: ""
	}, 0, row.receipt) : action === "essence-remove" ? parseGuildWorkflow({
		action: "essence_remove",
		essenceId: 0
	}, 0, row.receipt) : parseGuildWorkflow({
		action: "content_update",
		field: action === "intro-set" ? "intro" : "notice",
		content: ""
	}, 0, row.receipt);
	const expected = action === "essence-add" ? "added" : action === "essence-remove" ? "removed" : "updated";
	if (receipt.outcome !== expected) throw new Error("宗门业务响应不完整");
	return {
		outcome: "result",
		message: row.message
	};
}

//#endregion
export { parseRobotGuildContentAction };