import { requestBackend } from "./client.js";

//#region src/api/bot/guild-review-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门审核接口数据不完整");
	return value;
}
const nullableName = (value) => value === null || typeof value === "string";
const integer = (value, minimum) => Number.isSafeInteger(value) && Number(value) >= minimum;
async function getBackendGuildReview(bid, uid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildReview(await requestBackend(bid, "get_players_id_guild_review_applications", {
		path: { id: uid },
		query: { page }
	}));
}
function parseGuildReview(value) {
	const data = record(value);
	if (typeof data.hasGuild !== "boolean" || typeof data.canReview !== "boolean" || typeof data.isDeputy !== "boolean" || !nullableName(data.guildName) || !nullableName(data.roleName) || !integer(data.currentPage, 1) || !integer(data.totalPages, 0) || !integer(data.total, 0) || !Array.isArray(data.applications)) throw new Error("宗门审核接口数据不完整");
	for (const value of data.applications) {
		const row = record(value);
		if (!integer(row.id, 1) || !integer(row.userId, 0) || !nullableName(row.userName) || !nullableName(row.realmName) || row.createdAt !== null && (typeof row.createdAt !== "string" || !Number.isFinite(new Date(row.createdAt).getTime()))) throw new Error("宗门审核接口数据不完整");
	}
	return data;
}

//#endregion
export { getBackendGuildReview, parseGuildReview };