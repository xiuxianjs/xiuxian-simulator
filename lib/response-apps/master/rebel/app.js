import { rebelBackendMaster } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/rebel/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await rebelBackendMaster(params.bid, params.uid, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "叛离失败" }
		};
	}
}

//#endregion
export { App as default };