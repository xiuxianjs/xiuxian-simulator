import { confirmBackendPeiyuan, parsePeiyuanConfirm } from "../../../api/bot/peiyuan-confirm.js";

//#region src/response-apps/peiyuanDan/confirm/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: parsePeiyuanConfirm(params.load ? await params.load() : await confirmBackendPeiyuan(params.bid, params.uid, params.request))
		};
	} catch (error) {
		return {
			code: "CONFIRM_FAILED",
			message: error instanceof Error ? error.message : "确认失败",
			uid: params.uid
		};
	}
}

//#endregion
export { App as default };