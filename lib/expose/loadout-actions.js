import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseBackendEquipmentDetail } from "../api/bot/equipment-detail-queries.js";
import { parseBackendEquipmentEquip } from "../api/bot/equipment-equip.js";
import { parseRobotEquipmentAutoEquip } from "../api/bot/equipment-auto-equip.js";
import { parseBackendEquipmentUnequipOne, parseRobotEquipmentUnequipOne } from "../api/bot/equipment-unequip-one.js";
import { parseBackendSkillBookUnequip } from "../api/bot/skill-book-unequip.js";
import { parseRobotSkillVisibility } from "../api/bot/skill-visibility.js";

//#region src/expose/loadout-actions.ts
const nonempty = {
	type: "string",
	minLength: 1
};
const skillType = {
	type: "string",
	enum: [
		"战技",
		"被动技",
		"神通"
	]
};
const equipment = object({
	id: integer,
	...fields(text, "name equipmentType grade"),
	...fields(number, "physicalAttack physicalAttackPercent magicAttack magicAttackPercent physicalDefense physicalDefensePercent magicDefense magicDefensePercent hp hpPercent speed critRate critDamage")
}, ["magicDefensePercent"]);
const visibility = object({
	code: {
		type: "string",
		enum: ["UPDATED"]
	},
	bookId: integer,
	isHidden: boolean,
	message: text,
	name: text
}, ["name"]);
const bookInput = object({
	bookId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	},
	intentId: intentIdSchema,
	taskInput: taskInputSchema
}, ["intentId", "taskInput"]);
const loadoutActions = {
	get_equipped_detail: observation("查询本人指定类型当前穿戴的装备实例、属性及恢复效果；item.id 可用于 unequip_equipment_by_id，未穿戴时保留服务端拒绝。", "equipment.detail", object({ typeName: {
		type: "string",
		enum: [
			"武器",
			"饰品",
			"法袍",
			"衣服",
			"鞋",
			"鞋子",
			"头饰",
			"羽翼"
		]
	} }), object({
		playerName: text,
		item: object({
			...fields(integer, "id isLocked physicalAttack magicAttack physicalDefense magicDefense hp speed"),
			...fields(number, "physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent critRate critDamage antiCritRate hitRate dodgeRate"),
			...fields(text, "name gradeName crafterName"),
			recoveryEffects: list(object({
				...fields(text, "source name status statusText conditionText"),
				...fields(number, "templateId mp mental pieces currentPieces"),
				active: boolean
			}))
		}, [
			"gradeName",
			"crafterName",
			"recoveryEffects"
		])
	}, ["playerName"]), (input) => `/我的${input.typeName}`, (data) => {
		const rawItem = data?.item;
		const hasRecoveryEffects = rawItem?.recoveryEffects !== void 0 && rawItem?.recoveryEffects !== null;
		const result = parseBackendEquipmentDetail(data);
		if (!result.item) throw new Error("装备详情成功响应缺少装备");
		return {
			...result,
			item: {
				...result.item,
				recoveryEffects: hasRecoveryEffects ? result.item.recoveryEffects : void 0
			}
		};
	}, (input) => ({ typeName: input.typeName })),
	equip_equipment: mutation("穿戴指定装备实例编号或名称；优先使用编号。同消息新穿戴使用新 intentId，同次重试沿用原编号。", "equipment.equip", object({
		identifier: nonempty,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["equipped"]
		},
		equipment
	}), (input) => `/装备 ${input.identifier}`, (data) => {
		const result = parseBackendEquipmentEquip(data);
		if (result.outcome !== "equipped") throw new Error("穿戴装备响应未确认成功");
		return result;
	}, (input) => ({ identifier: input.identifier }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	equip_equipment_by_id: mutation("穿戴 get_equipment_bag 返回的装备实例，核对回执编号。同消息重新穿戴使用新 intentId，同次重试沿用原编号。", "equipment.equip", object({
		instanceId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["equipped"]
		},
		equipment
	}), (input) => `/装备 ${input.instanceId}`, (data, input) => {
		const result = parseBackendEquipmentEquip(data);
		if (result.outcome !== "equipped" || result.equipment?.id !== input.instanceId) throw new Error("穿戴装备回执与指定实例不匹配，请核对当前装备");
		return result;
	}, (input) => ({ identifier: String(input.instanceId) }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	auto_equip_equipment: mutation("由服务端自动选择装备，逐项检查 results。同消息新操作使用新 intentId，同次重试沿用原编号。", "equipment.auto-equip", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		success: boolean,
		message: text,
		power: number,
		results: list(object({
			typeName: text,
			equipped: boolean,
			equipmentName: text,
			reason: text
		}, ["equipmentName", "reason"]))
	}, ["power"]), () => "/一键装备", parseRobotEquipmentAutoEquip, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	unequip_equipment: mutation("卸下执行时指定类型当前装备；优先按实例编号卸下。同消息新操作使用新 intentId，同次重试沿用原编号。", "equipment.unequip-one", object({
		equipmentTypeName: nonempty,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["unequipped"]
		},
		stage: {
			type: "string",
			enum: ["cache_cleared"]
		},
		instanceId: integer
	}), (input) => `/卸下 ${input.equipmentTypeName}`, parseRobotEquipmentUnequipOne, (input) => ({ equipmentTypeName: input.equipmentTypeName }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	unequip_equipment_by_id: mutation("只卸下指定本人穿戴实例。检查 outcome 和 stage：not_equipped 未变更；failed/updated 已卸下但缓存刷新未完成；failed/write_uncertain 须先查询状态。同消息新卸下使用新 intentId，同次重试沿用原编号。", "equipment.unequip-instance", object({
		instanceId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		intentId: intentIdSchema
	}, ["intentId"]), object({
		outcome: {
			type: "string",
			enum: [
				"unequipped",
				"not_equipped",
				"failed"
			]
		},
		stage: {
			type: "string",
			enum: [
				"none",
				"write_uncertain",
				"updated",
				"cache_cleared"
			]
		},
		instanceId: integer
	}), () => "/卸下", (data, input) => {
		const result = parseBackendEquipmentUnequipOne(data);
		if (result.instanceId !== input.instanceId || result.outcome === "unequipped" && result.stage !== "cache_cleared" || result.outcome === "not_equipped" && result.stage !== "none" || result.outcome === "failed" && !["updated", "write_uncertain"].includes(result.stage) || ![
			"unequipped",
			"not_equipped",
			"failed"
		].includes(result.outcome)) throw new Error("卸下装备回执与指定实例不匹配，请核对当前装备");
		return result;
	}, (input) => ({ instanceId: input.instanceId }), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	unequip_skill_book: mutation("换下当前战技、被动技或神通，不遗忘或分解功法。同消息新卸下使用新 intentId，同次重试沿用原编号。", "skill-books.unequip", object({
		skillType,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["unequipped"]
		},
		skillBook: object({
			name: text,
			skillType: text
		}, ["name", "skillType"])
	}), (input) => `/换下${input.skillType}`, (data, input) => {
		const result = parseBackendSkillBookUnequip(data);
		if (result.outcome !== "unequipped" || result.skillBook?.skillType !== null && result.skillBook?.skillType !== input.skillType) throw new Error("换下功法响应不完整");
		return result;
	}, (input) => ({ skillType: input.skillType }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	hide_skill_book: mutation("隐藏本人已学功法；bookId 是功法实例编号，正在使用的功法由服务端拒绝。同消息新操作使用新 intentId，同次重试沿用原编号。", "skill-books.hide", bookInput, visibility, (input) => `/隐藏功法 ${input.bookId}`, (data, input) => parseRobotSkillVisibility(data, input.bookId, true), (input) => ({ bookId: String(input.bookId) }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	show_skill_book: mutation("恢复显示本人隐藏的已学功法；不自动切换功法。同消息新操作使用新 intentId，同次重试沿用原编号。", "skill-books.show", bookInput, visibility, (input) => `/显示功法 ${input.bookId}`, (data, input) => parseRobotSkillVisibility(data, input.bookId, false), (input) => ({ bookId: String(input.bookId) }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { loadoutActions };