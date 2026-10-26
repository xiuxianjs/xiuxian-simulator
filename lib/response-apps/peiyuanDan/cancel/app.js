import { cancelBackendPeiyuan } from "../../../api/bot/peiyuan-cancel.js";

//#region src/response-apps/peiyuanDan/cancel/app.ts
async function App(params) {
	const uid = params.uid;
	if (!uid) return { code: "INVALID_USER" };
	const result = await cancelBackendPeiyuan(params.bid, uid, params.request);
	if (result.outcome === "not_pending") return {
		code: "CANCEL_FAILED",
		message: result.message,
		uid
	};
	return {
		code: "OK",
		data: { message: result.message }
	};
}

//#endregion
export { App as default };