import { MSG_EQUIPMENT } from "../../../constants/messages.js";
import { equipBackendEquipment, parseEquipCommand } from "../../../api/bot/equipment-equip.js";

//#region src/response-apps/equipment/equipItem/app.ts
async function App(params) {
	try {
		const result = await equipBackendEquipment(params.bid, params.uid, params.identifier, params.request, params.messageText);
		if (result.outcome !== "equipped" || !result.equipment) return {
			code: "FAIL",
			data: { message: {
				not_found: "未找到该装备",
				not_found_or_equipped: "未找到该装备或装备已被装备",
				life_equipment: MSG_EQUIPMENT.CRAFT_EQUIP_USE_REPLACE,
				realm_insufficient: MSG_EQUIPMENT.REALM_INSUFFICIENT
			}[result.outcome] }
		};
		const item = result.equipment;
		return {
			code: "OK",
			data: {
				message: `成功装备 ${item.name}`,
				equipment: {
					...item,
					equipment: {
						name: item.name,
						grade: { name: item.grade },
						equipmentType: { name: item.equipmentType }
					}
				}
			}
		};
	} catch {
		return {
			code: "FAIL",
			data: { message: MSG_EQUIPMENT.EQUIP_FAILED }
		};
	}
}

//#endregion
export { App as default, parseEquipCommand };