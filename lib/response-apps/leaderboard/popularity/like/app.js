import { BackendAPIError } from "../../../../api/bot/client.js";
import { likeBackendPopularity } from "../../../../api/bot/popularity-like.js";
import { logger } from "alemonjs";

//#region src/response-apps/leaderboard/popularity/like/app.ts
async function App(params) {
	try {
		const result = await likeBackendPopularity(params.bid, params.uid, params.targetUid, params.boardType, params.request, params.messageText);
		return {
			code: "OK",
			data: {
				success: true,
				message: result.message,
				currentPopularity: result.currentPopularity,
				remainingLikes: result.remainingLikes,
				boardLabel: result.boardLabel
			}
		};
	} catch (error) {
		logger.error("[人气点赞] 错误:", error);
		if (error instanceof BackendAPIError && error.status !== void 0 && error.status < 500) return {
			code: "OK",
			data: {
				success: false,
				message: error.message
			}
		};
		return {
			code: "LOAD_FAILED",
			data: { message: "人气点赞失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };