import { MSG_EQUIPMENT } from "../../../constants/messages.js";
import { unequipBackendEquipmentOne } from "../../../api/bot/equipment-unequip-one.js";

//#region src/response-apps/equipment/unequipItem/app.ts
async function App(params) {
	try {
		const result = await unequipBackendEquipmentOne(params.bid, params.uid, params.equipmentTypeName, params.request, params.messageText);
		const messages = {
			type_missing: MSG_EQUIPMENT.TYPE_NOT_FOUND,
			templates_missing: `未找到${params.equipmentTypeName}类型的装备`,
			not_equipped: `未装备任何${params.equipmentTypeName}`,
			unequipped: `成功卸下${params.equipmentTypeName}`,
			failed: MSG_EQUIPMENT.UNEQUIP_FAILED
		};
		return {
			code: result.outcome === "unequipped" ? "OK" : "FAIL",
			data: { message: messages[result.outcome] }
		};
	} catch {
		return {
			code: "FAIL",
			data: { message: MSG_EQUIPMENT.UNEQUIP_FAILED }
		};
	}
}

//#endregion
export { App as default };