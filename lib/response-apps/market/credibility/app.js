import { marketCredibilityView } from "../../../api/bot/market-community-views.js";

//#region src/response-apps/market/credibility/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await marketCredibilityView(params.bid, params.uid, params.request)
		};
	} catch {
		return {
			code: "LOAD_FAILED",
			data: void 0
		};
	}
}

//#endregion
export { App as default };