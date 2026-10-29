import { decomposeBackendEquipment } from "../../../api/bot/equipment-decompose.js";
import { EMPTY_STRING } from "../../../constants/common.js";
import "../../../constants/index.js";

//#region src/response-apps/equipment/decompose/app.ts
function parseDecomposeCommand(messageText) {
	const idStr = (messageText || "").replace(/^(!|！|\/|#|＃)?分解装备\s*/, "").trim().split(/\s+/)[0];
	if (!idStr) return null;
	const id = parseInt(idStr, 10);
	if (isNaN(id) || id <= 0) return -1;
	return id;
}
async function App(params) {
	try {
		const result = await decomposeBackendEquipment(params.bid, params.uid, params.equipmentId, params.request, params.messageText);
		return {
			code: "OK",
			data: { message: `分解成功！【${result.equipmentName}】(${result.equipmentGrade}) → ${result.yieldItemName} ×${result.yieldQuantity}` }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "分解失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default, parseDecomposeCommand };