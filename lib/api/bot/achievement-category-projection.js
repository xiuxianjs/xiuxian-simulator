import { requestBackend } from "./client.js";

//#region src/api/bot/achievement-category-projection.ts
async function getBackendAchievementCategoryProjection(bid, uid, keyword) {
	return validateBackendAchievementCategoryProjection(await requestBackend(bid, "get_players_id_achievements_category_projection", {
		path: { id: uid },
		query: { keyword }
	}));
}
function validateBackendAchievementCategoryProjection(data) {
	if (!data || typeof data !== "object") throw new Error("成就分类投影响应不完整");
	const row = data;
	const access = row.access;
	if (!access || typeof access.canUseFifthLayerFeature !== "boolean" || typeof access.realmName !== "string" || typeof row.validCategory !== "boolean" || !Number.isInteger(row.total) || !Number.isInteger(row.completed) || !Number.isInteger(row.claimableCount) || !Array.isArray(row.items)) throw new Error("成就分类投影响应不完整");
	if (row.validCategory && (typeof row.category !== "string" || typeof row.label !== "string")) throw new Error("成就分类投影响应不完整");
	if (row.items.some((item) => !item || typeof item !== "object" || !Number.isInteger(item.id) || typeof item.name !== "string" || typeof item.description !== "string" || typeof item.completed !== "boolean" || typeof item.rewardText !== "string" || typeof item.progressText !== "string")) throw new Error("成就分类投影响应不完整");
	return data;
}

//#endregion
export { getBackendAchievementCategoryProjection, validateBackendAchievementCategoryProjection };