import { parseGuildWorkflow } from "./guild-workflow.js";

//#region src/api/bot/guild-content-robot-query.ts
function parseRobotGuildContent(value) {
	const row = parseGuildWorkflow({ action: "content" }, 0, value);
	if (!row.hasMembership) throw new Error("宗门业务响应不完整");
	return {
		guildName: row.guildName ?? "",
		notice: row.notice ?? null,
		intro: row.intro ?? null
	};
}
function presentGuildEssences(result) {
	return {
		success: true,
		guildName: result.guildName,
		essences: result.items.map((item) => ({
			...item,
			creatorName: item.creatorName ?? "未知",
			createdAt: item.createdAt
		})),
		total: result.total,
		currentPage: result.page,
		totalPages: result.totalPages
	};
}
function parseRobotGuildEssences(value) {
	const row = parseGuildWorkflow({
		action: "essences",
		page: 1
	}, 0, value);
	if (!row.hasMembership) throw new Error("宗门业务响应不完整");
	return presentGuildEssences(row);
}

//#endregion
export { parseRobotGuildContent, parseRobotGuildEssences, presentGuildEssences };