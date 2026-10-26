import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseSkillBookMaximum } from "../schemas/skill-book-maximum.js";

//#region src/api/bot/skill-book-learn.ts
const outcomes = /* @__PURE__ */ new Set([
	"learned",
	"confirmation_required",
	"empty_bag",
	"not_found",
	"unidentified",
	"already_learned",
	"locked",
	"in_use_conflict",
	"lower_grade"
]);
const skillTypes = /* @__PURE__ */ new Set([
	"战技",
	"被动技",
	"神通"
]);
function summary(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const row = value;
	if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id < 1 || typeof row.name !== "string" || typeof row.grade !== "string" || typeof row.realm !== "string" || !Number.isInteger(row.gradeLevel) || !Number.isInteger(row.proficiency) || typeof row.skillType !== "string" || !skillTypes.has(row.skillType)) return;
	return row;
}
function refund(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const row = value;
	if ([
		"totalExp",
		"baseExp",
		"upgradeExp",
		"upgradeCount",
		"transferredProficiency"
	].some((key) => !Number.isInteger(row[key])) || !Array.isArray(row.items) || row.items.some((item) => !item || typeof item !== "object" || !Number.isInteger(item.itemId) || typeof item.name !== "string" || !Number.isInteger(item.quantity) || !Number.isInteger(item.expValue))) return;
	return row;
}
async function learnBackendSkillBook(bid, uid, skillBookId, forceReplace, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendSkillBookLearn(await requestBackend(bid, "post_players_id_skill_books_skillBookId_learn", {
		path: {
			id: uid,
			skillBookId
		},
		body: { forceReplace },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendSkillBookLearn(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("学习功法响应不完整");
	const row = data;
	if (typeof row.outcome !== "string" || !outcomes.has(row.outcome)) throw new Error("学习功法响应不完整");
	const result = {
		outcome: row.outcome,
		skillBook: summary(row.skillBook),
		oldSkillBook: summary(row.oldSkillBook),
		targetMaximum: parseSkillBookMaximum(row.targetMaximum),
		oldMaximum: parseSkillBookMaximum(row.oldMaximum),
		refundInfo: refund(row.refundInfo)
	};
	if ((/* @__PURE__ */ new Set([
		"learned",
		"confirmation_required",
		"unidentified",
		"already_learned",
		"locked",
		"in_use_conflict",
		"lower_grade"
	])).has(result.outcome) && !result.skillBook) throw new Error("学习功法响应缺少目标功法");
	if ([
		"confirmation_required",
		"in_use_conflict",
		"lower_grade"
	].includes(result.outcome) && !result.oldSkillBook) throw new Error("学习功法响应缺少已学功法");
	if (result.outcome === "confirmation_required" && (!result.targetMaximum || !result.oldMaximum)) throw new Error("学习功法确认数据不完整");
	if (result.outcome === "learned" && result.oldSkillBook && !result.refundInfo) throw new Error("学习功法替换响应缺少返还结果");
	return result;
}
function parseRobotSkillBookLearn(data) {
	const result = parseBackendSkillBookLearn(data);
	if (result.outcome !== "learned" && result.outcome !== "confirmation_required") throw new Error("学习功法响应不完整");
	return result;
}

//#endregion
export { learnBackendSkillBook, parseBackendSkillBookLearn, parseRobotSkillBookLearn };