import { getBackendNotificationHistory } from "../../../api/bot/notification-history-queries.js";

//#region src/response-apps/notification/history/app.ts
async function App(params) {
	return await getBackendNotificationHistory(params.bid, params.uid, params.page);
}

//#endregion
export { App as default };