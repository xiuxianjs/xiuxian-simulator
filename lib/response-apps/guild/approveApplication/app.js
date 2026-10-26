import { decideBackendGuildApplication } from "../../../api/bot/guild-membership-mutations.js";

//#region src/response-apps/guild/approveApplication/app.ts
async function App(params) {
	try {
		const result = await decideBackendGuildApplication(params.bid, params.uid, params.applicantUid, true, params.request, params.repeatCommand);
		return {
			code: "OK",
			data: {
				success: result.outcome === "approved",
				message: result.message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "审核操作失败" }
		};
	}
}

//#endregion
export { App as default };