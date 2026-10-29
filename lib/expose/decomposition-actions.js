import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseBackendEquipmentDecompose } from "../api/bot/equipment-decompose.js";
import { parseBackendSkillBookDecompose } from "../api/bot/skill-book-decompose.js";
import { parseRobotEquipmentBatchQuery } from "../api/bot/equipment-batch-decompose.js";
import { parseRobotSkillBookBatchQuery } from "../api/bot/skill-book-batch-decompose.js";

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
const decompositionActions = {
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