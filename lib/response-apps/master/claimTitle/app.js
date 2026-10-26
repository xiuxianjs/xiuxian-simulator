import { BackendAPIError } from "../../../api/bot/client.js";
import { claimBackendMasterTitle } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/claimTitle/app.ts
async function App(params) {
	try {
		await claimBackendMasterTitle(params.bid, params.uid, params.request);
		return { code: "OK" };
	} catch (error) {
		if (!(error instanceof BackendAPIError)) return { code: "ERROR" };
		if (error.code === "MASTER_TITLE_ALREADY_CLAIMED") return { code: "ALREADY_CLAIMED" };
		if (error.code === "MASTER_TITLE_NOT_ELIGIBLE") return { code: "NOT_ELIGIBLE" };
		if (error.code === "MASTER_TITLE_NOT_FOUND") return { code: "TITLE_NOT_FOUND" };
		if (error.code === "IDEMPOTENCY_IN_PROGRESS") return { code: "LOCK_FAIL" };
		return { code: "ERROR" };
	}
}

//#endregion
export { App as default };