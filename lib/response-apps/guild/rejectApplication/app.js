import { decideBackendGuildApplication } from "../../../api/bot/guild-membership-mutations.js";

//#region src/response-apps/guild/rejectApplication/app.ts
async function App(params) {
	try {
		const result = await decideBackendGuildApplication(params.bid, params.uid, params.applicantUid, false, params.request);
		return {
			code: "OK",
			data: {
				success: result.outcome === "rejected",
				message: result.message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "拒绝操作失败" }
		};
	}
}

//#endregion
export { App as default };