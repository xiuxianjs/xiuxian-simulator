import { getBackendMeridians } from "../../../api/bot/meridian.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/meditation/meridian/app.ts
async function App(params) {
	try {
		if (!params.bid) throw new Error("经络查询缺少平台身份");
		const data = params.load ? await params.load() : await getBackendMeridians(params.bid, params.uid, params.request);
		const mapMeridian = (item) => ({
			index: item.index,
			phase: item.phase,
			phaseIndex: item.phaseIndex,
			phaseName: item.phaseName,
			normalPulsesRemaining: item.normalPulsesRemaining,
			tailJumpEscalation: item.tailJumpEscalation,
			name: item.Name,
			category: item.Category,
			description: item.Description,
			progress: item.Progress,
			requiredProgress: item.RequiredProgress,
			completed: item.completed
		});
		return {
			code: "OK",
			data: {
				success: true,
				message: "",
				phases: data.phases,
				currentPhase: data.currentPhase,
				currentPhaseName: data.currentPhaseName,
				basePulseRemaining: data.basePulseRemaining,
				extraPulseRemaining: data.extraPulseRemaining,
				canPulse: data.canPulse,
				pulseBlockedReason: data.pulseBlockedReason,
				trueQi: data.TrueQi,
				completedCount: data.CompletedCount,
				dailyPulseRemaining: data.DailyPulseRemaining,
				isLocked: data.isLocked,
				allCompleted: data.allCompleted,
				current: data.current ? mapMeridian(data.current) : null,
				next: data.next ? mapMeridian(data.next) : null,
				progressBar: data.progressBar,
				progressPercent: data.progressPercent,
				showPulseButton: data.showPulseButton,
				config: data.config,
				meridians: data.meridians.map(mapMeridian)
			}
		};
	} catch (error) {
		logger.error("[经络] 错误:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看经络失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };