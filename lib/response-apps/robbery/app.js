import { robBackend } from "../../api/bot/robbery.js";

//#region src/response-apps/robbery/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await robBackend(params.bid, params.uid, params.targetUid, params.request)
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "打劫失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };