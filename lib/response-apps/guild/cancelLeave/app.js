import { cancelBackendGuildLeaveConfirmation } from "../../../api/bot/guild-leave-confirmation-cancel.js";

//#region src/response-apps/guild/cancelLeave/app.ts
async function App(params) {
	try {
		await cancelBackendGuildLeaveConfirmation(params.bid, params.uid, params.request);
		return {
			code: "OK",
			data: { message: "✅ 已取消退出宗门操作" }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "取消操作失败" }
		};
	}
}

//#endregion
export { App as default };