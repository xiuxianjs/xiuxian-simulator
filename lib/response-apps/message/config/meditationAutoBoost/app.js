import { runRobotBusiness } from "../../../../response/robotBusiness.js";
import { validateRobotPreference } from "../../../../api/bot/settings-robot-query.js";

//#region src/response-apps/message/config/meditationAutoBoost/app.ts
function App(event, next, enabled) {
	return runRobotBusiness(event, "settings.meditation-auto-boost", { value: enabled }, (data) => validateRobotPreference(data, "meditationAutoBoost", enabled, enabled), next);
}

//#endregion
export { App as default };