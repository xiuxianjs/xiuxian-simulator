import { claimBackendSecretRealm } from "../../../api/bot/guild-secret-realm-war.js";

//#region src/response-apps/guildSecretRealmWar/claim/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await claimBackendSecretRealm(params.bid, params.uid, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "领取奖励失败" }
		};
	}
}

//#endregion
export { App as default };