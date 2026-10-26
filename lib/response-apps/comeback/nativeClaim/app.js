import { requestBackend, writeContext } from "../../../api/bot/client.js";
import { parseNativeComebackClaim } from "../../../api/bot/native-comeback.js";
import { logger } from "alemonjs";

//#region src/response-apps/comeback/nativeClaim/app.ts
async function App(params) {
	try {
		const result = await requestBackend(params.bid, "post_players_id_native_comeback_claim", {
			path: { id: params.uid },
			...writeContext(params.request)
		});
		return {
			code: "OK",
			data: parseNativeComebackClaim(result)
		};
	} catch (error) {
		logger.error("领取本服回归奖励失败:", error);
		return {
			code: "FAILED",
			data: { message: error instanceof Error ? error.message : "领取本服回归奖励失败" }
		};
	}
}

//#endregion
export { App as default };