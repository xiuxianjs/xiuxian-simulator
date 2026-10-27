import { getBackendDungeonDetailCommand } from "../../../api/bot/query-presentation.js";
import { buildDropDetailCommand, dungeonDetailView, formatDropProbability } from "../../../response/dungeon/detail/view.js";

//#region src/response-apps/dungeon/detail/app.ts
async function App(params) {
	try {
		const item = await getBackendDungeonDetailCommand(params.bid, params.uid, params.dungeonName, params.messageText, params.request);
		return {
			code: "OK",
			data: dungeonDetailView(item)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "秘境详情读取失败" }
		};
	}
}

//#endregion
export { buildDropDetailCommand, App as default, formatDropProbability };