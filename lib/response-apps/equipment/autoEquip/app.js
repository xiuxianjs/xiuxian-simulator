import { autoEquipBackendEquipment } from "../../../api/bot/equipment-auto-equip.js";

//#region src/response-apps/equipment/autoEquip/app.ts
async function App(params) {
	try {
		const result = await autoEquipBackendEquipment(params.bid, params.uid, params.request, params.messageText);
		if (!result.success && result.results.length === 0) return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: {
				message: result.message,
				results: result.results,
				power: result.power
			}
		};
	} catch {
		return {
			code: "FAIL",
			data: { message: "一键装备失败，请稍后重试" }
		};
	}
}

//#endregion
export { App as default };