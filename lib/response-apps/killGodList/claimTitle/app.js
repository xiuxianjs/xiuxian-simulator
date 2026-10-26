import { claimBackendKillGodTitle } from "../../../api/bot/shaqi-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/killGodList/claimTitle/app.ts
async function App(params) {
	try {
		return { code: await claimBackendKillGodTitle(params.bid, params.uid, params.request) };
	} catch (error) {
		logger.error("[领取杀神称号] 错误:", error);
		return { code: "ERROR" };
	}
}

//#endregion
export { App as default };