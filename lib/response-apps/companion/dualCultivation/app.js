import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { dualCultivateBackendCompanion } from "../../../api/bot/companion-relationship-actions.js";

//#region src/response-apps/companion/dualCultivation/app.ts
/** The robot forwards the command and renders the Go settlement. */
async function App(params) {
	try {
		const result = await dualCultivateBackendCompanion(params.bid, params.uid, params.request, params.messageText);
		return {
			code: "OK",
			data: {
				expGained: result.experienceGained,
				partnerExpGained: result.experienceGained,
				tongxinGained: result.tongxinGained
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "双修失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };