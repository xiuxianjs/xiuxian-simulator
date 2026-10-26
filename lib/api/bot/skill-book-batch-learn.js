import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-batch-learn.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("一键学习功法接口响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(`一键学习功法接口字段无效: ${field}`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string") throw new Error(`一键学习功法接口字段无效: ${field}`);
	return value;
}
function book(value) {
	const row = record(value);
	return {
		name: text(row.name, "book.name"),
		skillType: text(row.skillType, "book.skillType")
	};
}
async function getBackendSkillBookBatchLearnCandidates(bid, uid) {
	if (!bid) throw new Error("缺少平台身份");
	return parseCandidates(record(await requestBackend(bid, "get_players_id_skill_books_batch_learn_candidates", { path: { id: uid } })));
}
function parseCandidates(value) {
	const data = record(value);
	if (!Array.isArray(data.candidates) || !Array.isArray(data.skippedConflicts)) throw new Error("一键学习功法接口响应不完整");
	return {
		candidates: data.candidates.map((value) => {
			const row = record(value);
			return {
				...book(row),
				userSkillBookId: integer(row.userSkillBookId, "candidate.userSkillBookId"),
				skillId: integer(row.skillId, "candidate.skillId"),
				gradeLevel: integer(row.gradeLevel, "candidate.gradeLevel")
			};
		}),
		skippedConflicts: data.skippedConflicts.map((value) => {
			const row = record(value);
			return {
				...book(row),
				reason: text(row.reason, "skipped.reason")
			};
		})
	};
}
function parseResults(data) {
	if (!Array.isArray(data)) throw new Error("一键学习功法接口响应不完整");
	return data.map((value) => {
		const row = record(value);
		if (typeof row.success !== "boolean") throw new Error("一键学习功法接口字段无效: result.success");
		return {
			userSkillBookId: integer(row.userSkillBookId, "result.userSkillBookId"),
			success: row.success,
			message: text(row.message, "result.message"),
			skillBook: row.skillBook === void 0 ? void 0 : book(row.skillBook)
		};
	});
}
async function batchLearnCurrentBackendSkillBooks(bid, uid, request) {
	if (!bid) throw new Error("缺少平台身份");
	const data = record(await requestBackend(bid, "post_players_id_skill_books_batch_learn_current", {
		path: { id: uid },
		...writeContext(request)
	}));
	return {
		selection: parseCandidates(data.selection),
		results: parseResults(data.results)
	};
}
function parseRobotSkillBookBatchLearn(value) {
	const row = record(value);
	if (row.mode !== "preview" && row.mode !== "execute") throw new Error("一键学习功法接口响应不完整");
	return {
		mode: row.mode,
		selection: parseCandidates(row.selection),
		results: parseResults(row.results)
	};
}

//#endregion
export { batchLearnCurrentBackendSkillBooks, getBackendSkillBookBatchLearnCandidates, parseRobotSkillBookBatchLearn };