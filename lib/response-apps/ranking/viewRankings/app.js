import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendTongtianTower } from "../../../api/bot/tongtian-tower.js";

//#region src/response-apps/ranking/viewRankings/app.ts
async function App(params) {
	if (!/^(?:!|！|\/|#|＃)?(?:查看)?通天塔(?:\s+我的)?\s*$/.test(params.messageText || "")) return { code: "NO_MATCH" };
	try {
		return {
			code: "MY_VIEW",
			data: await getBackendTongtianTower(params.bid, params.uid)
		};
	} catch (error) {
		return {
			code: "FAILED",
			message: error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : "通天塔加载失败，请稍后再试"
		};
	}
}

//#endregion
export { App as default };