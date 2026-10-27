import { number as number$1 } from "../schemas/ranking-values.js";
import { requestBackend } from "./client.js";
import { mapLearnedBookFacts } from "./learned-books-queries.js";

//#region src/api/bot/skill-detail-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("功法详情接口格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("功法详情接口缺少数值字段");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("功法详情接口缺少文本字段");
	return value;
}
const integer = (value) => number$1(value, "功法详情接口缺少数值字段");
const nullableInteger = (value) => value === null ? null : integer(value);
const nullableNumber = (value) => value === null ? null : number(value);
const nullableText = (value) => value === null ? null : text(value);
function rowsText(value) {
	if (!Array.isArray(value)) throw new Error("恢复效率说明数据无效");
	return value.map(text);
}
function detailDisplay(value) {
	const row = record(value);
	if (typeof row.canComprehend !== "boolean" || typeof row.canUseMingwudan !== "boolean" || typeof row.canReset !== "boolean") throw new Error("功法详情接口缺少操作资格");
	const visibilityAction = text(row.visibilityAction);
	const visibilityLabel = nullableText(row.visibilityLabel);
	if (visibilityAction !== "SHOW" && visibilityAction !== "HIDE" && visibilityAction !== "NONE" || (visibilityAction === "NONE" ? visibilityLabel !== null : visibilityLabel !== (visibilityAction === "SHOW" ? "显示" : "隐藏"))) throw new Error("功法详情接口可见性操作无效");
	if (!Array.isArray(row.narrativeLines) || !Array.isArray(row.effectLines) || !Array.isArray(row.attributeLines)) throw new Error("功法详情接口缺少展示文案");
	return {
		titleText: text(row.titleText),
		damageLine: nullableText(row.damageLine),
		statusLine: text(row.statusLine),
		proficiencyText: text(row.proficiencyText),
		canComprehend: row.canComprehend,
		canUseMingwudan: row.canUseMingwudan,
		visibilityAction,
		visibilityLabel,
		canReset: row.canReset,
		cooldownLine: text(row.cooldownLine),
		costLine: nullableText(row.costLine),
		defenseIgnoreLine: nullableText(row.defenseIgnoreLine),
		triggerLine: nullableText(row.triggerLine),
		narrativeLines: row.narrativeLines.map(text),
		effectLines: row.effectLines.map(text),
		effectNamesLine: nullableText(row.effectNamesLine),
		attributeLines: row.attributeLines.map(text),
		recoveryLines: row.recoveryLines === void 0 || row.recoveryLines === null ? [] : rowsText(row.recoveryLines)
	};
}
function effect(value) {
	const row = record(value);
	const result = {
		name: text(row.name),
		module: row.module === null ? null : integer(row.module),
		camp: nullableText(row.camp)
	};
	for (const key of [
		"probability",
		"type",
		"applyTiming",
		"effectTiming",
		"applyProbability",
		"effectProbability",
		"duration",
		"multiplier",
		"maxStacks",
		"attributeModule"
	]) if (row[key] !== void 0 && row[key] !== null) result[key] = integer(row[key]);
	if (row.removable !== void 0 && row.removable !== null) {
		if (typeof row.removable !== "boolean") throw new Error("功法详情接口缺少效果移除状态");
		result.removable = row.removable;
	}
	if (row.triggerScope !== void 0 && row.triggerScope !== null) result.triggerScope = text(row.triggerScope);
	return result;
}
async function getBackendSkillDetail(bid, uid, bookId) {
	if (!bid) throw new Error("查询缺少平台身份");
	return mapBackendSkillDetail(await requestBackend(bid, "get_players_id_skill_books_learned_bookId", { path: {
		id: uid,
		bookId
	} }), bookId);
}
function mapBackendSkillDetail(value, bookId) {
	const result = record(value);
	if (typeof result.hasLearnedBooks !== "boolean") throw new Error("功法详情接口缺少已学状态");
	const outcome = text(result.outcome);
	if (outcome !== "OK" && outcome !== "NOT_FOUND" && outcome !== "NO_SKILL_BOOKS") throw new Error("功法详情接口结果无效");
	const proficiencyPoints = integer(result.proficiencyPoints);
	if (result.book === null) {
		if (outcome === "OK" || result.hasLearnedBooks !== (outcome === "NOT_FOUND")) throw new Error("功法详情接口结果不一致");
		return {
			outcome,
			hasLearnedBooks: result.hasLearnedBooks,
			book: null,
			proficiencyPoints
		};
	}
	const row = record(result.book);
	const base = mapLearnedBookFacts([row])[0];
	if (outcome !== "OK" || !result.hasLearnedBooks || base.id !== bookId) throw new Error("功法详情接口实例不匹配");
	if (!Array.isArray(row.buffNames) || !Array.isArray(row.skillEffects)) throw new Error("功法详情接口缺少效果列表");
	return {
		outcome,
		hasLearnedBooks: true,
		proficiencyPoints,
		book: {
			...base,
			skillId: nullableInteger(row.skillId) ?? void 0,
			skillName: text(row.skillName),
			skillTypeId: nullableInteger(row.skillTypeId) ?? void 0,
			skillModule: nullableInteger(row.skillModule),
			multiplier: nullableNumber(row.multiplier),
			camp: nullableText(row.camp),
			cost: nullableInteger(row.cost),
			cooldown: nullableInteger(row.cooldown),
			triggerCondition: nullableText(row.triggerCondition),
			targetCount: nullableInteger(row.targetCount),
			defenseIgnorePercent: nullableNumber(row.defenseIgnorePercent),
			buffNames: row.buffNames.map(text),
			skillEffects: row.skillEffects.map(effect),
			detailDisplay: detailDisplay(row.detailDisplay)
		}
	};
}
function parseRobotSkillDetail(value) {
	const row = record(value);
	const bookId = integer(row.bookId);
	const result = mapBackendSkillDetail(row.detail, bookId);
	if (result.outcome !== "OK" || !result.book) throw new Error("功法详情接口缺少实例");
	return {
		skillBook: result.book,
		skillBookId: bookId,
		proficiencyPoints: result.proficiencyPoints
	};
}

//#endregion
export { getBackendSkillDetail, mapBackendSkillDetail, parseRobotSkillDetail };