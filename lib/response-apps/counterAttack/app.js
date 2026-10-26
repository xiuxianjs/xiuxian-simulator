import { BackendAPIError } from "../../api/bot/client.js";
import { counterAttackBackend } from "../../api/bot/counter-attack.js";

//#region src/response-apps/counterAttack/app.ts
async function App(params) {
	const { uid, bid, robberyLogId, request } = params;
	if (!Number.isSafeInteger(robberyLogId) || robberyLogId <= 0) return {
		code: "INVALID_ID",
		data: { message: "记录ID无效" }
	};
	try {
		return {
			code: "OK",
			data: await counterAttackBackend(bid, uid, robberyLogId, request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: {
				message: error instanceof BackendAPIError ? error.message : "反击失败，请稍后再试",
				isEnergyInsufficient: error instanceof BackendAPIError && error.code === "COUNTER_ATTACK_INSUFFICIENT_QI"
			}
		};
	}
}

//#endregion
export { App as default };