import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { claimBackendCelestialCheckIn } from "../../../api/bot/celestial-checkin.js";
import { presentCelestialCheckIn } from "../../../api/bot/signin-robot-query.js";

//#region src/response-apps/signIn/celestial/app.ts
async function App(params) {
	try {
		const data = await claimBackendCelestialCheckIn(params.bid, params.uid, params.request, params.messageText);
		return presentCelestialCheckIn(data);
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof BackendAPIError ? error.message : "登仙台签到失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };