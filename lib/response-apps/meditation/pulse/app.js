import { BackendAPIError } from "../../../api/bot/client.js";
import { pulseBackendMeridian } from "../../../api/bot/meridian.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/meditation/pulse/app.ts
async function App(params) {
	try {
		if (!params.bid) throw new Error("冲脉请求缺少平台身份");
		const remote = params.load ? await params.load() : await pulseBackendMeridian(params.bid, params.uid, params.request);
		return {
			code: "OK",
			data: {
				success: true,
				message: "",
				phase: remote.phase,
				phaseName: remote.phaseName,
				phaseCompleted: remote.phaseCompleted,
				allCompleted: remote.allCompleted,
				canPulse: remote.canPulse,
				pulseBlockedReason: remote.pulseBlockedReason,
				description: remote.Description,
				jumped: remote.jumped,
				completed: remote.completed,
				meridianName: remote.Name,
				progressBefore: remote.progressBefore,
				progressAfter: remote.Progress,
				meridianRequiredProgress: remote.RequiredProgress,
				trueQiRemaining: remote.trueQiRemaining,
				dailyPulseRemaining: remote.dailyPulseRemaining,
				basePulseRemaining: remote.basePulseRemaining,
				extraPulseRemaining: remote.extraPulseRemaining,
				config: remote.config
			}
		};
	} catch (error) {
		logger.error("[冲脉] 错误:", {
			requestId: params.request?.requestId,
			error
		});
		if (error instanceof BackendAPIError && [
			"MERIDIAN_REALM_LOCKED",
			"INSUFFICIENT_TRUE_QI",
			"MEDITATION_REQUIRED",
			"DAILY_PULSE_LIMIT_REACHED",
			"MERIDIANS_COMPLETE",
			"MERIDIAN_CONFIG_UNAVAILABLE"
		].includes(error.code ?? "")) return {
			code: "LOAD_FAILED",
			data: { message: `❌ ${error.message}` }
		};
		return {
			code: "LOAD_FAILED",
			data: { message: "冲脉失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };