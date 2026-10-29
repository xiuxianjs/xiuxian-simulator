import { validateRobotPreference } from "../../../../api/bot/settings-robot-query.js";
import { runRobotBusiness } from "../../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/message/config/hideProfile/app.ts
async function App(params) {
	try {
		const action = params.action;
		const response = await runRobotBusiness(params.event, "settings.hide-profile", { value: action.enabled }, (data) => validateRobotPreference(data, "hideProfile", action.enabled, action), params.next);
		return response.handled ? void 0 : {
			code: "OK",
			data: response.data
		};
	} catch (error) {
		logger.error(error);
		return { code: "SET_FAILED" };
	}
}

//#endregion
export { App as default };