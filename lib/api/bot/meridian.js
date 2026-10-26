import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/meridian.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const meridianStatus = (value) => record(value) && [
	value.index,
	value.phase,
	value.phaseIndex,
	value.normalPulsesRemaining,
	value.Progress,
	value.RequiredProgress
].every(integer) && typeof value.tailJumpEscalation === "boolean" && typeof value.phaseName === "string" && typeof value.Name === "string" && typeof value.Category === "string" && typeof value.Description === "string" && typeof value.completed === "boolean";
const meridianPhases = (value) => Array.isArray(value) && value.every((item) => record(item) && [
	item.phase,
	item.totalCount,
	item.completedCount
].every(integer) && typeof item.name === "string" && typeof item.completed === "boolean" && typeof item.unlocked === "boolean");
const meridianConfig = (value) => record(value) && [
	"TOTAL_COUNT",
	"QI_PER_MERIDIAN",
	"PULSE_QI_COST",
	"PULSE_PROGRESS",
	"DAILY_PULSE_MAX",
	"DAILY_EXTRA_PULSE_MAX",
	"FOUNDATION_STAGE_LEVEL"
].every((field) => integer(value[field])) && Object.values(value).every(integer);
async function getBackendMeridians(bid, uid, request) {
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1) throw new Error("经络查询参数无效");
	return parseMeridianView(await requestBackend(bid, "get_players_id_meridians", {
		path: { id: uid },
		requestId: request?.requestId
	}));
}
function parseMeridianView(data) {
	if (!record(data) || !Array.isArray(data.meridians) || data.meridians.length === 0 || !data.meridians.every(meridianStatus) || !meridianConfig(data.config) || !meridianPhases(data.phases) || ![
		data.currentPhase,
		data.basePulseRemaining,
		data.extraPulseRemaining
	].every(integer) || typeof data.currentPhaseName !== "string" || typeof data.canPulse !== "boolean" || typeof data.pulseBlockedReason !== "string" || ![
		data.TrueQi,
		data.DailyPulseRemaining,
		data.CompletedCount,
		data.progressPercent
	].every(integer) || typeof data.isLocked !== "boolean" || typeof data.allCompleted !== "boolean" || typeof data.showPulseButton !== "boolean" || typeof data.progressBar !== "string" || data.current !== null && !meridianStatus(data.current) || data.next !== null && !meridianStatus(data.next) || (data.allCompleted ? data.current !== null || data.next !== null : data.current === null)) throw new Error("经络接口返回不完整，请更新服务端后重试");
	return data;
}
async function pulseBackendMeridian(bid, uid, request) {
	if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1) throw new Error("冲脉参数无效");
	return parseMeridianPulse(await requestBackend(bid, "post_players_id_meridians_pulse", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseMeridianPulse(data) {
	if (!meridianStatus(data) || !meridianConfig(data?.config) || !meridianPhases(data.phases) || typeof data.phaseCompleted !== "boolean" || typeof data.allCompleted !== "boolean" || typeof data.canPulse !== "boolean" || typeof data.pulseBlockedReason !== "string" || typeof data.jumped !== "boolean" || ![
		data.progressBefore,
		data.basePulseRemaining,
		data.extraPulseRemaining,
		data.trueQiRemaining,
		data.dailyPulseRemaining
	].every(integer)) throw new Error("冲脉接口返回不完整，请更新服务端后重试");
	return data;
}

//#endregion
export { getBackendMeridians, parseMeridianPulse, parseMeridianView, pulseBackendMeridian };