import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/equipment-decompose.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("装备分解接口响应不完整");
	return value;
}
function positiveInteger(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error(`装备分解接口字段无效: ${field}`);
	return value;
}
async function decomposeBackendEquipment(bid, uid, instanceId, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseBackendEquipmentDecompose(await requestBackend(bid, "post_players_id_equipment_decompose", {
		path: { id: uid },
		body: { instanceId },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendEquipmentDecompose(value) {
	const row = record(value);
	for (const field of [
		"equipmentName",
		"equipmentGrade",
		"yieldItemName"
	]) if (typeof row[field] !== "string" || !row[field]) throw new Error(`装备分解接口字段无效: ${field}`);
	return {
		instanceId: positiveInteger(row.instanceId, "instanceId"),
		equipmentName: row.equipmentName,
		equipmentGrade: row.equipmentGrade,
		yieldItemId: positiveInteger(row.yieldItemId, "yieldItemId"),
		yieldItemName: row.yieldItemName,
		yieldQuantity: positiveInteger(row.yieldQuantity, "yieldQuantity")
	};
}

//#endregion
export { decomposeBackendEquipment, parseBackendEquipmentDecompose };