import { validateRobotPreference } from "../../../../api/bot/settings-robot-query.js";
import { runRobotBusiness } from "../../../../response/robotBusiness.js";
import { logger } from "alemonjs";

//#region src/response-apps/message/config/update/app.ts
async function App(params) {
	try {
		const action = params.action;
		const spirit = action.type === "CONFIRM_SPIRIT_CRYSTAL";
		const value = Number.isFinite(action.threshold) ? action.threshold : null;
		const response = await runRobotBusiness(params.event, spirit ? "settings.spirit-crystal-confirmation" : "settings.dao-crystal-confirmation", { value }, (data) => validateRobotPreference(data, spirit ? "confirmSpiritCrystal" : "confirmDaoCrystal", value, action), params.next);
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