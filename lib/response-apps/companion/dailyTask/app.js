import { getBackendCompanionTasks } from "../../../api/bot/companion-tasks-queries.js";
import { presentCompanionTasks } from "../../../utils/companionQueryPresentation.js";

//#region src/response-apps/companion/dailyTask/app.ts
async function App(params) {
	return presentCompanionTasks(await getBackendCompanionTasks(params.bid, params.uid), params.args);
}

//#endregion
export { App as default };