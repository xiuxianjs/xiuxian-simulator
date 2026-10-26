import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/equipment-equip.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("装备接口响应不完整");
	return value;
}
function finite(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("装备接口数值无效");
	return value;
}
function equipment(value) {
	const row = record(value);
	if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id < 1) throw new Error("装备接口数值无效");
	for (const key of [
		"name",
		"equipmentType",
		"grade"
	]) if (typeof row[key] !== "string") throw new Error("装备接口展示字段无效");
	for (const key of [
		"physicalAttack",
		"physicalAttackPercent",
		"magicAttack",
		"magicAttackPercent",
		"physicalDefense",
		"physicalDefensePercent",
		"magicDefense",
		"hp",
		"hpPercent",
		"speed",
		"critRate",
		"critDamage"
	]) finite(row[key]);
	if (row.magicDefensePercent !== void 0) finite(row.magicDefensePercent);
	return row;
}
async function equipBackendEquipment(bid, uid, identifier, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseBackendEquipmentEquip(await requestBackend(bid, "post_players_id_equipment_equip", {
		path: { id: uid },
		body: { identifier },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendEquipmentEquip(value) {
	const data = record(value);
	if (typeof data.outcome !== "string" || ![
		"equipped",
		"not_found",
		"not_found_or_equipped",
		"life_equipment",
		"realm_insufficient"
	].includes(data.outcome)) throw new Error("装备接口结果无效");
	if (data.outcome === "equipped") return {
		outcome: "equipped",
		equipment: equipment(data.equipment)
	};
	if (data.equipment !== void 0) throw new Error("装备失败响应不应包含装备");
	return { outcome: data.outcome };
}
function parseEquipCommand(messageText) {
	return messageText.trim().match(/^(!|！|\/|#|＃)?装备\s+(.+)$/)?.[2]?.trim() ?? null;
}
function parseRobotEquipmentEquip(value) {
	const result = parseBackendEquipmentEquip(value);
	if (result.outcome !== "equipped" || !result.equipment) throw new Error("装备接口结果无效");
	const item = result.equipment;
	return {
		message: `成功装备 ${item.name}`,
		equipment: {
			...item,
			equipment: {
				name: item.name,
				grade: { name: item.grade },
				equipmentType: { name: item.equipmentType }
			}
		}
	};
}

//#endregion
export { equipBackendEquipment, parseBackendEquipmentEquip, parseEquipCommand, parseRobotEquipmentEquip };