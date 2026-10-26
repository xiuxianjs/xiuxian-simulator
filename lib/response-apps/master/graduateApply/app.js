import { applyBackendGraduation } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/graduateApply/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await applyBackendGraduation(params.bid, params.uid, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "申请出师失败" }
		};
	}
}

//#endregion
export { App as default };