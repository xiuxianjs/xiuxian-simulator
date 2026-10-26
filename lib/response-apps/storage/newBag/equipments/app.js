import { getBackendEquipmentBag } from "../../../../api/bot/queries.js";
import "../../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/newBag/equipments/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendEquipmentBag(params.bid, params.uid, params.equipmentType, params.page)
		};
	} catch (error) {
		logger.error("查询装备失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };