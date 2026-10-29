import { getBackendCompanionInfo } from "../../../api/bot/companion-info-queries.js";
import { presentCompanionInfo } from "../../../utils/companionQueryPresentation.js";

//#region src/response-apps/companion/info/app.ts
async function App(params) {
	return presentCompanionInfo(await getBackendCompanionInfo(params.bid, params.uid));
}

//#endregion
export { App as default };