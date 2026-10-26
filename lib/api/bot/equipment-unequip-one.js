import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeTraceContext } from "./client.js";

//#region src/api/bot/equipment-unequip-one.ts
async function unequipBackendEquipmentOne(bid, uid, equipmentTypeName, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseBackendEquipmentUnequipOne(await requestBackend(bid, "post_players_id_equipment_unequip_one", {
		path: { id: uid },
		body: { equipmentTypeName },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeTraceContext(request)
	}));
}
function parseBackendEquipmentUnequipOne(value) {
	const data = value;
	if (!data || typeof data !== "object" || Array.isArray(data) || ![
		"type_missing",
		"templates_missing",
		"not_equipped",
		"unequipped",
		"failed"
	].includes(data.outcome) || ![
		"none",
		"write_uncertain",
		"updated",
		"cache_cleared"
	].includes(data.stage) || data.instanceId !== null && (typeof data.instanceId !== "number" || !Number.isSafeInteger(data.instanceId) || data.instanceId < 1)) throw new Error("卸下装备响应不完整");
	return data;
}
function parseRobotEquipmentUnequipOne(value) {
	const out = parseBackendEquipmentUnequipOne(value);
	if (out.outcome !== "unequipped" || out.stage !== "cache_cleared" || out.instanceId === null) throw new Error("卸下装备响应不完整");
	return out;
}

//#endregion
export { parseBackendEquipmentUnequipOne, parseRobotEquipmentUnequipOne, unequipBackendEquipmentOne };