import { BackendAPIError } from "../../api/bot/client.js";
import { commandBackendSpar } from "../../api/bot/spar.js";

//#region src/response-apps/spar/app.ts
const positiveInteger = (value) => {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
};
/** The robot only invokes the Go settlement and maps its receipt for the legacy renderer. */
async function App(params) {
	try {
		const command = await commandBackendSpar(params.bid, params.uid, params.targetUid, params.targetBid, params.request);
		if (!command.allowed) return {
			code: "REALM_LOCKED",
			data: {
				message: "",
				realmName: command.realmName
			}
		};
		if (!command.targetUid) return {
			code: "NEED_TARGET",
			data: { message: "请提供有效的玩家UID，或直接 @目标 进行比试" }
		};
		const result = command.battle;
		if (!result) throw new Error("比试响应不完整");
		return {
			code: "OK",
			data: {
				battleResult: {
					...result.battleView,
					totalWaves: 1,
					winner: result.winner
				},
				targetUid: command.targetUid,
				logId: result.battleLogId,
				hpCost: result.qiCost,
				dailyMax: result.dailyMax,
				newCount: result.newCount,
				expGain: result.baseExperience,
				expBonusText: result.expBonusText,
				proficiencyResult: result.proficiencyResult
			}
		};
	} catch (error) {
		if (error instanceof BackendAPIError) {
			if (error.code === "SPAR_SELF_TARGET") return {
				code: "SELF_TARGET",
				data: { message: error.message }
			};
			if (error.code === "SPAR_TARGET_NOT_FOUND") return {
				code: "TARGET_NOT_FOUND",
				data: { message: error.message }
			};
			if (error.code === "SPAR_DAILY_LIMIT") return {
				code: "DAILY_LIMIT",
				data: { message: error.message }
			};
			if (error.code === "SPAR_REALM_LOCKED") {
				const details = error.details;
				const realmName = details && typeof details === "object" ? details.realmName : void 0;
				if (typeof realmName === "string") return {
					code: "REALM_LOCKED",
					data: {
						message: error.message,
						realmName
					}
				};
			}
		}
		if (error instanceof BackendAPIError && error.code === "QI_NOT_ENOUGH") {
			const details = error.details;
			const qiPillCount = details && typeof details === "object" ? positiveInteger(details.qiPillCount) : null;
			if (qiPillCount !== null) return {
				code: "QI_NOT_ENOUGH",
				data: {
					message: error.message,
					qiPillCount
				}
			};
		}
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "比试失败" }
		};
	}
}

//#endregion
export { App as default };