import { parseRecoveryEffects } from "../schemas/resource-recovery.js";
import { requestBackend } from "./client.js";

//#region src/api/bot/equipped-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("查询接口返回格式不完整");
	return value;
}
function rows(value) {
	if (!Array.isArray(value)) throw new Error("查询接口缺少列表");
	return value.map(record);
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("查询接口缺少数值字段");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("查询接口缺少文本字段");
	return value;
}
function integer(value, minimum = Number.MIN_SAFE_INTEGER) {
	const result = number(value);
	if (!Number.isSafeInteger(result) || result < minimum) throw new Error("查询接口整数字段无效");
	return result;
}
function equipmentItem(value) {
	const row = record(value);
	const equipment = record(row.equipment);
	return {
		id: integer(row.id, 0),
		equipmentId: integer(row.equipmentId, 0),
		equipment: {
			id: integer(equipment.id, 0),
			name: text(equipment.name),
			equipmentTypeId: integer(equipment.equipmentTypeId, 0),
			setId: equipment.setId === null ? null : integer(equipment.setId, 0)
		}
	};
}
function setEffect(value) {
	const facts = record(value);
	return {
		pieces: integer(facts.pieces),
		physicalAttack: integer(facts.physicalAttack),
		magicAttack: integer(facts.magicAttack),
		physicalDefense: integer(facts.physicalDefense),
		magicDefense: integer(facts.magicDefense),
		hp: integer(facts.hp),
		speed: integer(facts.speed),
		physicalAttackPercent: number(facts.physicalAttackPercent),
		magicAttackPercent: number(facts.magicAttackPercent),
		physicalDefensePercent: number(facts.physicalDefensePercent),
		magicDefensePercent: number(facts.magicDefensePercent),
		hpPercent: number(facts.hpPercent),
		speedPercent: number(facts.speedPercent),
		critRate: number(facts.critRate),
		critDamage: number(facts.critDamage),
		antiCritRate: number(facts.antiCritRate),
		hitRate: number(facts.hitRate),
		dodgeRate: number(facts.dodgeRate),
		normalAttackCritRate: number(facts.normalAttackCritRate),
		skillCritRate: number(facts.skillCritRate),
		ultimateCritRate: number(facts.ultimateCritRate),
		allSkillCritRate: number(facts.allSkillCritRate)
	};
}
async function getBackendEquipped(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendEquipped(await requestBackend(bid, "get_players_id_equipment_equipped", { path: { id: uid } }));
}
function parseBackendEquipped(value) {
	const data = record(value);
	if (typeof data.canUseFifthLayerFeature !== "boolean") throw new Error("查询接口缺少境界资格");
	return {
		playerName: data.playerName === null ? null : text(data.playerName),
		canUseFifthLayerFeature: data.canUseFifthLayerFeature,
		types: rows(data.types).map((row) => ({
			id: integer(row.id, 0),
			name: text(row.name)
		})),
		items: rows(data.items).map(equipmentItem),
		slots: rows(data.slots).map((row) => {
			const type = record(row.type);
			return {
				type: {
					id: integer(type.id, 0),
					name: text(type.name)
				},
				item: row.item === null ? null : equipmentItem(row.item)
			};
		}),
		sets: rows(data.sets).map((row) => ({
			id: integer(row.id, 0),
			name: row.name === null ? null : text(row.name),
			count: integer(row.count),
			recoveryEffects: parseRecoveryEffects(row.recoveryEffects),
			effects: rows(row.effects).map((effect) => {
				if (typeof effect.active !== "boolean") throw new Error("查询接口缺少套装激活状态");
				return {
					active: effect.active,
					effect: setEffect(effect.effect)
				};
			})
		}))
	};
}

//#endregion
export { getBackendEquipped, parseBackendEquipped };