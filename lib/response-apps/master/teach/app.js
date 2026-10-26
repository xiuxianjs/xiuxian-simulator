import { parseTeachMasterCommand } from "../../../utils/masterCommand.js";
import { teachBackendMaster } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/teach/app.ts
async function App(params) {
	try {
		const result = await teachBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: { message: result.message.includes("\n") ? result.message.split("\n").filter(Boolean) : result.message }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "传功失败" }
		};
	}
}

//#endregion
export { App as default, parseTeachMasterCommand };