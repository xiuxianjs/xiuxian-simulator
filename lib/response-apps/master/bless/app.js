import { blessBackendMaster } from "../../../api/bot/master-actions.js";
import { parseBlessMasterCommand } from "../../../utils/masterCommand.js";

//#region src/response-apps/master/bless/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await blessBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "赐福失败" }
		};
	}
}

//#endregion
export { App as default, parseBlessMasterCommand };