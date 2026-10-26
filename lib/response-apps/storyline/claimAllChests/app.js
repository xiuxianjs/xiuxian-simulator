import { claimAllBackendStorylineChests } from "../../../api/bot/storyline-chest-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/storyline/claimAllChests/app.ts
async function App(params) {
	try {
		const result = await claimAllBackendStorylineChests(params.bid, params.uid, params.request);
		return {
			code: "OK",
			data: {
				success: result.success,
				message: result.message,
				details: result.details
			}
		};
	} catch (error) {
		logger.error("一键领取宝箱失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "领取失败，请稍后重试" }
		};
	}
}

//#endregion
export { App as default };