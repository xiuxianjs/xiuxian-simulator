import { requestBackend } from "../../../api/bot/client.js";
import { parseNativeComebackOverview } from "../../../api/bot/native-comeback.js";
import { logger } from "alemonjs";

//#region src/response-apps/comeback/native/app.ts
async function App(params) {
	try {
		const data = await requestBackend(params.bid, "get_players_id_native_comeback", { path: { id: params.uid } });
		return {
			code: "OK",
			data: parseNativeComebackOverview(data)
		};
	} catch (error) {
		logger.error("加载本服回归奖励失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "加载本服回归奖励失败" }
		};
	}
}

//#endregion
export { App as default };