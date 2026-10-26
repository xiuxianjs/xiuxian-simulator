import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { endBackendSeclusion } from "../../../api/bot/seclusion-end.js";

//#region src/response-apps/seclusion/end/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: params.load ? await params.load() : await endBackendSeclusion(params.bid, params.uid, params.request)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof BackendAPIError ? error.message : "出关失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };