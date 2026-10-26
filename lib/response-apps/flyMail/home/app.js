import { parseFlyMailHomeCommand } from "../../../utils/flyMailCommand.js";
import { getBackendFlyMailHome } from "../../../api/bot/fly-mail-queries.js";

//#region src/response-apps/flyMail/home/app.ts
async function App(params) {
	return {
		code: "OK",
		data: await getBackendFlyMailHome(params.bid, params.uid, params.scope, params.page)
	};
}

//#endregion
export { App as default, parseFlyMailHomeCommand };