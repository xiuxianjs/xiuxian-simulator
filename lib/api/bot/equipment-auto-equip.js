import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/equipment-auto-equip.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("一键装备接口响应不完整");
	return value;
}
function optionalText(value, field) {
	if (value === void 0) return;
	if (typeof value !== "string") throw new Error(`一键装备接口字段无效: ${field}`);
	return value;
}
function row(value) {
	const data = record(value);
	if (typeof data.typeName !== "string" || typeof data.equipped !== "boolean") throw new Error("一键装备接口结果字段无效");
	return {
		typeName: data.typeName,
		equipped: data.equipped,
		equipmentName: optionalText(data.equipmentName, "equipmentName"),
		reason: optionalText(data.reason, "reason")
	};
}
async function autoEquipBackendEquipment(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseBackendEquipmentAutoEquip(await requestBackend(bid, "post_players_id_equipment_auto_equip", {
		path: { id: uid },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendEquipmentAutoEquip(value) {
	const data = record(value);
	if (typeof data.success !== "boolean" || typeof data.message !== "string" || !Array.isArray(data.results)) throw new Error("一键装备接口响应不完整");
	if (data.power !== void 0 && (typeof data.power !== "number" || !Number.isFinite(data.power))) throw new Error("一键装备接口战力无效");
	return {
		success: data.success,
		message: data.message,
		results: data.results.map(row),
		...data.power === void 0 ? {} : { power: data.power }
	};
}
function parseRobotEquipmentAutoEquip(value) {
	const out = parseBackendEquipmentAutoEquip(value);
	if (!out.success && out.results.length === 0) throw new Error("一键装备接口响应不完整");
	return out;
}

//#endregion
export { autoEquipBackendEquipment, parseBackendEquipmentAutoEquip, parseRobotEquipmentAutoEquip };