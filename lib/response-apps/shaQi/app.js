import { getBackendShaQi } from "../../api/bot/shaqi-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/shaQi/app.ts
async function App(params) {
	try {
		const info = await getBackendShaQi(params.bid, params.uid);
		if (!info) return {
			code: "LOAD_FAILED",
			data: { message: "无法获取煞气信息" }
		};
		return {
			code: "OK",
			data: {
				shaQi: info.shaQi,
				onKillGodList: info.onKillGodList,
				killGodThreshold: info.killGodThreshold,
				dailyDecayAmount: info.dailyDecayAmount,
				jinpenReduceAmount: info.jinpenReduceAmount
			}
		};
	} catch (error) {
		logger.error("[煞气] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "获取煞气信息失败" }
		};
	}
}

//#endregion
export { App as default };