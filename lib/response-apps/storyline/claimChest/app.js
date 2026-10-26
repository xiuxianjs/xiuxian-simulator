import { claimAllBackendChapterChests, claimBackendStorylineChest } from "../../../api/bot/storyline-chest-claim.js";
import { logger } from "alemonjs";

//#region src/response-apps/storyline/claimChest/app.ts
async function App(params) {
	if (!params.chapterNumber) return { code: "INVALID_PARAMS" };
	try {
		const result = params.chestIndex !== null ? await claimBackendStorylineChest(params.bid, params.uid, params.chapterNumber, params.chestIndex, params.request) : await claimAllBackendChapterChests(params.bid, params.uid, params.chapterNumber, params.request);
		return {
			code: "OK",
			data: {
				chapterNumber: result.chapterNumber,
				message: result.message,
				claimedIndexes: result.claimedIndexes,
				success: result.success,
				chests: result.chests
			}
		};
	} catch (error) {
		logger.error("领取宝箱失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "领取宝箱失败，请稍后重试" }
		};
	}
}

//#endregion
export { App as default };