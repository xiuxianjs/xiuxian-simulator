import { challengeBackendSecretRealm } from "../../../api/bot/guild-secret-realm-war.js";

//#region src/response-apps/guildSecretRealmWar/challenge/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: await challengeBackendSecretRealm(params.bid, params.uid, params.realmNo, params.positionNo, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "挑战失败" }
		};
	}
}

//#endregion
export { App as default };