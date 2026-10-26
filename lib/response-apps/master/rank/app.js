import { getBackendMasterRanking } from "../../../api/bot/queries.js";
import "../../../api/index.js";

//#region src/response-apps/master/rank/app.ts
function App(params) {
	return getBackendMasterRanking(params.bid, params.uid);
}

//#endregion
export { App as default };