import { presentCompanionTasks } from "../../../utils/companionQueryPresentation.js";
import { getBackendCompanionTasks } from "../../../api/bot/companion-tasks-queries.js";

//#region src/response-apps/companion/dailyTask/app.ts
async function App(params) {
	return presentCompanionTasks(await getBackendCompanionTasks(params.bid, params.uid), params.args);
}

//#endregion
export { App as default };