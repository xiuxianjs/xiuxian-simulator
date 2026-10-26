import { getBackendSeclusionSelection } from "../../../api/bot/seclusion-status.js";
import { logger } from "alemonjs";

//#region src/response-apps/seclusion/select/app.ts
async function App(params) {
	try {
		const selection = await getBackendSeclusionSelection(params.bid, params.uid, params.dungeonName);
		if (selection.code === "IN_SECLUSION") return {
			code: "IN_SECLUSION",
			data: { status: selection.status }
		};
		if (selection.code === "DUNGEON_NOT_FOUND") return {
			code: "DUNGEON_NOT_FOUND",
			data: { message: selection.message }
		};
		return {
			code: "OK",
			data: {
				status: selection.status,
				dungeon: selection.dungeon
			}
		};
	} catch (error) {
		logger.error("[探索] 选择时长错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };