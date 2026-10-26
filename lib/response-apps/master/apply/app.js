import { parseApplyMasterCommand } from "../../../utils/masterCommand.js";
import { applyBackendMaster } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/apply/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await applyBackendMaster(params.bid, params.uid, params.targetArg, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "拜师申请失败" }
		};
	}
}

//#endregion
export { App as default, parseApplyMasterCommand };