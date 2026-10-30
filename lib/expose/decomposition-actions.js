import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { confirmationReferenceSchema, validateConfirmationReference } from "./confirmation.js";
import { parseBackendEquipmentDecompose } from "../api/bot/equipment-decompose.js";
import { parseBackendSkillBookDecompose } from "../api/bot/skill-book-decompose.js";
import { parseBackendEquipmentBatchDecompose, parseRobotEquipmentBatchQuery, preview } from "../api/bot/equipment-batch-decompose.js";
import { parseBackendSkillBookBatchDecompose, parseRobotSkillBookBatchQuery, preview as preview$1 } from "../api/bot/skill-book-batch-decompose.js";

//#region src/expose/decomposition-actions.ts
const id = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const grade = {
	type: "string",
	minLength: 1,
	maxLength: 100
};
const breakdown = list(object({
	id: integer,
	gradeName: text,
	level: integer,
	count: integer
}));
const equipmentPreview = object({
	success: boolean,
	message: text,
	...fields(integer, "totalCount processCount remainingCount totalYield"),
	gradeBreakdown: breakdown
});
const skillItem = object({
	...fields(integer, "itemId quantity expValue"),
	name: text
});
const skillPreview = object({
	success: boolean,
	message: text,
	...fields(integer, "totalCount processCount remainingCount totalExp"),
	gradeBreakdown: breakdown,
	estimatedItems: list(skillItem)
});
const batchSchema = (preview) => object({
	mode: text,
	options: preview,
	preview,
	selectedGrade: object({
		id: integer,
		name: text
	})
}, ["preview", "selectedGrade"]);
const instance = object({
	instanceId: id,
	templateId: id,
	name: text,
	gradeId: id,
	gradeName: text
});
function checkedInstances(value, ids) {
	if (!Array.isArray(value) || value.length !== ids.length || value.some((item, i) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) return true;
		const row = item;
		return row.instanceId !== ids[i] || !Number.isSafeInteger(row.templateId) || Number(row.templateId) <= 0 || !Number.isSafeInteger(row.gradeId) || Number(row.gradeId) <= 0 || typeof row.name !== "string" || typeof row.gradeName !== "string";
	})) throw new Error("分解实例明细不完整");
	return value;
}
const decompositionActions = {
	prepare_skill_batch_decomposition: observation("准备功法批量分解，返回原实例编号、返还估算和 60 秒确认引用；省略品级表示全部。候选或返还规则变化时确认会拒绝。", "skill-books.batch-decompose-prepare-reference", object({ gradeId: id }, ["gradeId"]), object({
		reference: confirmationReferenceSchema,
		expiresAt: integer,
		preview: skillPreview,
		instanceIds: list(id),
		instances: list(instance)
	}), () => "/一键分解功法 全部", (data) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("功法分解预览不完整");
		const row = data;
		const preview = preview$1(row.preview);
		if (typeof row.reference !== "string" || !Number.isSafeInteger(row.expiresAt) || !Array.isArray(row.instanceIds) || row.instanceIds.length !== preview.processCount || row.instanceIds.some((value) => !Number.isSafeInteger(value) || value <= 0) || new Set(row.instanceIds).size !== row.instanceIds.length || !preview.success) throw new Error("功法分解预览不匹配");
		validateConfirmationReference(row.reference, "e");
		const instances = checkedInstances(row.instances, row.instanceIds);
		return {
			reference: row.reference,
			expiresAt: row.expiresAt,
			preview,
			instanceIds: row.instanceIds,
			instances
		};
	}, (input) => ({ gradeId: input.gradeId ?? null })),
	confirm_skill_batch_decomposition: mutation("确认原功法分解预览，按服务端快照在单事务中结算；相同引用重试返回原回执。", "skill-books.batch-decompose-confirm-reference", object({ reference: confirmationReferenceSchema }), object({
		success: boolean,
		message: text,
		...fields(integer, "decomposedCount remainingCount totalExp"),
		items: list(skillItem)
	}), () => "确认分解", (data) => {
		const result = parseBackendSkillBookBatchDecompose(data);
		if (!result.success || result.decomposedCount < 1 || result.decomposedCount > 300) throw new Error("功法分解回执不完整");
		return result;
	}, (input) => ({ reference: input.reference }), (input) => validateConfirmationReference(input.reference, "e")),
	prepare_equipment_batch_decomposition: observation("准备装备批量分解，返回原实例编号、估算结果和 60 秒确认引用；省略品级表示全部。背包或规则变化时确认会拒绝。", "equipment.batch-decompose-prepare-reference", object({ gradeId: id }, ["gradeId"]), object({
		reference: confirmationReferenceSchema,
		expiresAt: integer,
		preview: equipmentPreview,
		instanceIds: list(id),
		instances: list(instance)
	}), () => "/一键分解装备 全部", (data) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("装备分解预览不完整");
		const row = data;
		const preview$2 = preview(row.preview);
		if (typeof row.reference !== "string" || !Number.isSafeInteger(row.expiresAt) || !Array.isArray(row.instanceIds) || row.instanceIds.length !== preview$2.processCount || row.instanceIds.some((value) => !Number.isSafeInteger(value) || value <= 0) || new Set(row.instanceIds).size !== row.instanceIds.length || !preview$2.success) throw new Error("装备分解预览不匹配");
		validateConfirmationReference(row.reference, "d");
		const instances = checkedInstances(row.instances, row.instanceIds);
		return {
			reference: row.reference,
			expiresAt: row.expiresAt,
			preview: preview$2,
			instanceIds: row.instanceIds,
			instances
		};
	}, (input) => ({ gradeId: input.gradeId ?? null })),
	confirm_equipment_batch_decomposition: mutation("确认原装备分解预览，按服务端快照在单事务中结算；相同引用重试返回原回执。", "equipment.batch-decompose-confirm-reference", object({ reference: confirmationReferenceSchema }), object({
		success: boolean,
		message: text,
		...fields(integer, "decomposedCount remainingCount totalYield"),
		details: list(object({
			name: text,
			grade: text,
			yield: integer
		}))
	}), () => "确认分解", (data) => {
		const result = parseBackendEquipmentBatchDecompose(data);
		if (!result.success || result.decomposedCount < 1 || result.decomposedCount > 300 || result.details.length !== result.decomposedCount) throw new Error("装备分解回执不完整");
		return result;
	}, (input) => ({ reference: input.reference }), (input) => validateConfirmationReference(input.reference, "d")),
	preview_equipment_batch_decomposition: observation("查询当前可分解装备和按品级估算；此结果不锁定实例清单，也不执行分解。", "equipment.batch-decompose-query", object({ gradeName: grade }, ["gradeName"]), batchSchema(equipmentPreview), (input) => `/一键分解装备${input.gradeName ? ` ${input.gradeName}` : ""}`, parseRobotEquipmentBatchQuery, (input) => ({ gradeName: input.gradeName ?? "" })),
	preview_skill_batch_decomposition: observation("查询当前可分解功法和按品级估算；此结果不锁定实例清单，也不执行分解。", "skill-books.batch-decompose-query", object({ gradeName: grade }, ["gradeName"]), batchSchema(skillPreview), (input) => `/一键分解功法${input.gradeName ? ` ${input.gradeName}` : ""}`, parseRobotSkillBookBatchQuery, (input) => ({ gradeName: input.gradeName ?? "" })),
	decompose_equipment: mutation("分解明确指定的装备实例，不可撤销；服务端检查归属、锁定和装备状态并返回实际产物。", "equipment.decompose", object({ instanceId: id }), object({
		...fields(integer, "instanceId yieldItemId yieldQuantity"),
		...fields(text, "equipmentName equipmentGrade yieldItemName")
	}), (input) => `/分解装备 ${input.instanceId}`, (data, input) => {
		const result = parseBackendEquipmentDecompose(data);
		if (result.instanceId !== input.instanceId) throw new Error("装备分解回执实例不匹配");
		return result;
	}, (input) => ({ instanceId: String(input.instanceId) })),
	decompose_skill_book: mutation("分解明确指定的功法实例，不可撤销；服务端检查归属、锁定及使用状态并返回实际返还。", "skill-books.decompose", object({ instanceId: id }), object({
		...fields(integer, "instanceId refundExp baseExp"),
		...fields(text, "name skillType grade realm"),
		refundedItems: list(skillItem)
	}), (input) => `/分解功法 ${input.instanceId}`, (data, input) => {
		const result = parseBackendSkillBookDecompose(data);
		if (result.instanceId !== input.instanceId) throw new Error("功法分解回执实例不匹配");
		return result;
	}, (input) => ({ bookId: String(input.instanceId) }))
};

//#endregion
export { decompositionActions };