import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-proficiency.ts
const outcomes = /* @__PURE__ */ new Set([
	"ok",
	"no_skill_books",
	"not_found",
	"invalid_input",
	"max_proficiency",
	"insufficient_points"
]);
function integer(row, field) {
	if (!Number.isInteger(row[field])) throw new Error(`参悟功法接口字段无效: ${field}`);
	return row[field];
}
async function useBackendSkillBookProficiency(bid, uid, identifier, points, request) {
	if (!bid) throw new Error("缺少平台身份");
	const all = points === "全部";
	return parseBackendSkillBookProficiency(await requestBackend(bid, "post_players_id_skill_books_proficiency", {
		path: { id: uid },
		body: all ? {
			identifier,
			all
		} : {
			identifier,
			all,
			points
		},
		...writeContext(request)
	}));
}
function parseBackendSkillBookProficiency(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("参悟功法接口响应不完整");
	const row = data;
	if (typeof row.outcome !== "string" || !outcomes.has(row.outcome)) throw new Error("参悟功法接口响应不完整");
	const outcome = row.outcome;
	const result = { ...row };
	if (outcome === "ok") {
		for (const field of [
			"oldProficiency",
			"newProficiency",
			"remainingPoints",
			"successCount",
			"failCount"
		]) result[field] = row[field] === void 0 ? 0 : row[field];
		result.skillBookName = row.skillBookName === void 0 ? "" : row.skillBookName;
		result.pityTriggered = row.pityTriggered === void 0 ? false : row.pityTriggered;
		for (const field of [
			"skillBookName",
			"consumedPoints",
			"oldProficiency",
			"newProficiency",
			"remainingPoints",
			"successCount",
			"failCount"
		]) if (field === "skillBookName") {
			if (typeof result[field] !== "string") throw new Error(`参悟功法接口字段无效: ${field}`);
		} else integer(result, field);
		if (typeof result.pityTriggered !== "boolean") throw new Error("参悟功法接口字段无效: pityTriggered");
	}
	if (outcome === "insufficient_points") {
		result.currentPoints = row.currentPoints === void 0 ? 0 : row.currentPoints;
		integer(result, "currentPoints");
		integer(row, "requiredPoints");
	}
	return result;
}

//#endregion
export { parseBackendSkillBookProficiency, useBackendSkillBookProficiency };