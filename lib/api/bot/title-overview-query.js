import { requestBackend } from "./client.js";

//#region src/api/bot/title-overview-query.ts
async function getBackendTitleOverview(bid, uid) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("称号概览参数无效");
	return validateBackendTitleOverview(await requestBackend(bid, "get_players_id_titles_overview", { path: { id: uid } }));
}
function validateBackendTitleOverview(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("称号概览响应不完整");
	const row = data;
	if (typeof row.moodText !== "string" || !Array.isArray(row.titles)) throw new Error("称号概览响应不完整");
	const titles = row.titles.map((value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("称号概览响应不完整");
		const item = value;
		if (!Number.isSafeInteger(item.id) || typeof item.title !== "string" || typeof item.isActive !== "boolean" || item.description !== null && item.description !== void 0 && typeof item.description !== "string" || item.bonusSummary !== null && item.bonusSummary !== void 0 && typeof item.bonusSummary !== "string" || item.expireDate !== null && item.expireDate !== void 0 && typeof item.expireDate !== "string" || typeof item.actionLabel !== "string" || typeof item.actionCommand !== "string") throw new Error("称号概览响应不完整");
		return {
			id: item.id,
			title: item.title,
			isActive: item.isActive,
			description: item.description ?? null,
			bonusSummary: item.bonusSummary ?? null,
			expireDate: item.expireDate ?? null,
			actionLabel: item.actionLabel,
			actionCommand: item.actionCommand
		};
	});
	return {
		moodText: row.moodText,
		titles
	};
}

//#endregion
export { getBackendTitleOverview, validateBackendTitleOverview };