import { getBackendDungeonCatalog } from "../../../api/bot/queries.js";
import "../../../api/bot/index.js";

//#region src/response-apps/dungeon/list/app.ts
async function App(params) {
	const data = await getBackendDungeonCatalog(params.bid, params.uid, params.page);
	return {
		code: data.pagination.total === 0 ? "EMPTY" : "OK",
		data
	};
}

//#endregion
export { App as default };