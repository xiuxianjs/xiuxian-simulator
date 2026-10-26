import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-visibility.ts
async function setBackendSkillVisibility(bid, uid, bookId, isHidden, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendSkillVisibility(await requestBackend(bid, "put_players_id_skill_books_learned_bookId_visibility", {
		path: {
			id: uid,
			bookId
		},
		body: { isHidden },
		...context
	}), bookId, isHidden);
}
function parseBackendSkillVisibility(data, bookId, isHidden) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("功法显示状态响应不完整");
	const value = data;
	if (typeof value.code !== "string" || ![
		"UPDATED",
		"NOT_FOUND",
		"IN_USE",
		"UNCHANGED"
	].includes(value.code) || value.bookId !== bookId || typeof value.isHidden !== "boolean" || typeof value.message !== "string" || value.name !== null && typeof value.name !== "string") throw new Error("功法显示状态响应不完整");
	if (value.code === "UPDATED" && value.isHidden !== isHidden) throw new Error("功法显示状态不一致");
	return data;
}
function parseRobotSkillVisibility(data, bookId, isHidden) {
	const result = parseBackendSkillVisibility(data, bookId, isHidden);
	if (result.code !== "UPDATED") throw new Error("功法显示状态响应不完整");
	return result;
}

//#endregion
export { parseBackendSkillVisibility, parseRobotSkillVisibility, setBackendSkillVisibility };