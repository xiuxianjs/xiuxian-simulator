import { getBackendWorldBossInfo } from "../../../api/bot/world-boss-info-queries.js";
import { worldBossInfoView } from "../../../response/worldBoss/view.js";
import { logger } from "alemonjs";

//#region src/response-apps/worldBoss/info/app.ts
async function App(params) {
	try {
		const info = await getBackendWorldBossInfo(params.bid, params.uid);
		return {
			code: "OK",
			data: worldBossInfoView(info)
		};
	} catch (error) {
		logger.error("查询凶兽信息失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };