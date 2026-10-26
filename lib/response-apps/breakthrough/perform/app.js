import { BackendAPIError } from "../../../api/bot/client.js";
import { performBackendRealmBreakthrough } from "../../../api/bot/realm-breakthrough.js";

//#region src/response-apps/breakthrough/perform/app.ts
async function App(params) {
	const { uid, bid, request } = params;
	try {
		const result = params.load ? await params.load() : await performBackendRealmBreakthrough(bid, uid, request);
		return {
			code: "SUCCESS",
			data: {
				...result,
				newStageName: result.newStageName || null
			}
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "突破过程中发生未知错误，请稍后再试或联系运营。";
		if (error instanceof BackendAPIError && error.code === "REALM_VERSION_CAPPED") {
			const details = error.details;
			if (details && typeof details === "object" && "realmName" in details && typeof details.realmName === "string") return {
				code: "REALM_CAPPED",
				data: { realmName: details.realmName }
			};
			return {
				code: "ERROR",
				data: { message: "突破接口返回不完整，请更新服务端后重试" }
			};
		}
		return {
			code: "FAIL",
			data: {
				message,
				isStageFull: error instanceof BackendAPIError && error.code === "REALM_STAGE_FULL"
			}
		};
	}
}

//#endregion
export { App as default };