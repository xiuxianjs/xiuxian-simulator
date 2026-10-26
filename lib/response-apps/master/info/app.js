import { getBackendMasterInfo } from "../../../api/bot/master-info-queries.js";

//#region src/response-apps/master/info/app.ts
function App(params) {
	return getBackendMasterInfo(params.bid, params.uid);
}

//#endregion
export { App as default };