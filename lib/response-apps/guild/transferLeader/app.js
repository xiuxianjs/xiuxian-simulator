import { transferBackendGuildLeadership } from "../../../api/bot/guild-member-lifecycle.js";

//#region src/response-apps/guild/transferLeader/app.ts
async function App(params) {
	try {
		const result = await transferBackendGuildLeadership(params.bid, params.uid, params.index, params.request);
		if (result.outcome === "candidates") return {
			code: "CANDIDATES",
			data: { topMembers: result.candidates }
		};
		if (result.outcome === "confirmation_required") return {
			code: "CONFIRMATION_REQUIRED",
			data: {
				message: result.message,
				seconds: result.confirmationExpiresInSeconds ?? 60
			}
		};
		return {
			code: "TRANSFER_DONE",
			data: {
				success: result.outcome === "transferred",
				message: result.message
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "转让失败" }
		};
	}
}

//#endregion
export { App as default };