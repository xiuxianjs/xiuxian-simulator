import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-wudao.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function number(value, field) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`悟道响应字段无效: ${field}`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string") throw new Error(`悟道响应字段无效: ${field}`);
	return value;
}
function positive(value, field) {
	const result = number(value, field);
	if (!Number.isSafeInteger(result) || result <= 0) throw new Error(`悟道响应字段无效: ${field}`);
	return result;
}
function valid(bid, uid, skillBookId) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(skillBookId) || skillBookId <= 0) throw new Error("悟道参数无效");
}
async function getBackendWudaoOptions(bid, uid, skillBookId) {
	valid(bid, uid, skillBookId);
	return parseWudaoOptions(row(await requestBackend(bid, "get_players_id_skill_books_skillBookId_wudao_options", { path: {
		id: uid,
		skillBookId
	} }), "悟道候选响应不完整"));
}
function parseWudaoOptions(value) {
	const data = row(value, "悟道候选响应不完整");
	if (!Array.isArray(data.options)) throw new Error("悟道候选响应不完整");
	const status = text(data.status, "status");
	if (status !== "ready" && status !== "no_stone" && status !== "no_record" && status !== "no_attrs") throw new Error("悟道候选响应不完整");
	return {
		skillBookId: positive(data.skillBookId, "skillBookId"),
		skillBookName: text(data.skillBookName, "skillBookName"),
		ownedStones: number(data.ownedStones, "ownedStones"),
		status,
		message: data.message === void 0 ? "" : text(data.message, "message"),
		options: data.options.map((value) => {
			const option = row(value, "悟道候选响应不完整");
			if (typeof option.isPercent !== "boolean") throw new Error("悟道候选响应不完整");
			return {
				key: text(option.key, "option.key"),
				label: text(option.label, "option.label"),
				isPercent: option.isPercent,
				currentMax: number(option.currentMax, "option.currentMax"),
				templateMax: number(option.templateMax, "option.templateMax"),
				currentMaxText: text(option.currentMaxText, "option.currentMaxText"),
				templateMaxText: text(option.templateMaxText, "option.templateMaxText")
			};
		})
	};
}
async function wudaoBackendSkillBook(bid, uid, skillBookId, attribute, request) {
	valid(bid, uid, skillBookId);
	if (!attribute.trim()) throw new Error("该属性不可悟道。");
	return parseWudaoResult(row(await requestBackend(bid, "post_players_id_skill_books_skillBookId_wudao", {
		path: {
			id: uid,
			skillBookId
		},
		body: { attribute },
		...writeContext(request)
	}), "悟道结算响应不完整"));
}
function parseWudaoResult(value) {
	const data = row(value, "悟道结算响应不完整");
	if (typeof data.isPercent !== "boolean") throw new Error("悟道结算响应不完整");
	return {
		skillBookId: positive(data.skillBookId, "skillBookId"),
		skillBookName: text(data.skillBookName, "skillBookName"),
		key: text(data.key, "key"),
		label: text(data.label, "label"),
		isPercent: data.isPercent,
		oldMax: number(data.oldMax, "oldMax"),
		newMax: number(data.newMax, "newMax"),
		templateMax: number(data.templateMax, "templateMax"),
		growth: number(data.growth, "growth"),
		remaining: number(data.remaining, "remaining"),
		growthText: text(data.growthText, "growthText"),
		newMaxText: text(data.newMaxText, "newMaxText"),
		templateMaxText: text(data.templateMaxText, "templateMaxText")
	};
}
async function commandBackendWudao(bid, uid, skillBookId, label, request) {
	valid(bid, uid, skillBookId);
	const data = row(await requestBackend(bid, "post_players_id_skill_books_skillBookId_wudao_command", {
		path: {
			id: uid,
			skillBookId
		},
		body: { label },
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}), "悟道响应不完整");
	if (typeof data.failure !== "string") throw new Error("悟道响应不完整");
	return {
		options: parseWudaoOptions(data.options),
		result: data.result === null ? null : parseWudaoResult(data.result),
		failure: data.failure
	};
}

//#endregion
export { commandBackendWudao, getBackendWudaoOptions, parseWudaoOptions, parseWudaoResult, wudaoBackendSkillBook };