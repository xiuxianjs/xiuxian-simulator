import { parseMasterGiftCommand } from "../../../utils/masterCommand.js";
import { giftBackendMaster } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/gift/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await giftBackendMaster(params.bid, params.uid, params.discipleArg, params.pillType, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "赐丹失败" }
		};
	}
}

//#endregion
export { App as default, parseMasterGiftCommand };