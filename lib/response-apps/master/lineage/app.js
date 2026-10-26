import { getBackendMasterLineage } from "../../../api/bot/master-lineage-queries.js";

//#region src/response-apps/master/lineage/app.ts
function App(params) {
	return getBackendMasterLineage(params.bid, params.uid);
}

//#endregion
export { App as default };