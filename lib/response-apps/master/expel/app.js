import { expelBackendMaster } from "../../../api/bot/master-actions.js";
import { parseExpelMasterCommand } from "../../../utils/masterCommand.js";

//#region src/response-apps/master/expel/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await expelBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "逐出师门失败" }
		};
	}
}

//#endregion
export { App as default, parseExpelMasterCommand };