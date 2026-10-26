import { requestBackend } from "./client.js";

//#region src/api/bot/task-config.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const validConfig = (value) => record(value) && Array.isArray(value.slots) && value.slots.length === 10 && value.slots.every((slot) => record(slot) && typeof slot.alias === "string" && Array.isArray(slot.steps) && slot.steps.every((step) => typeof step === "string"));
const validLimits = (value) => record(value) && typeof value.isMonthCard === "boolean" && value.slotCount === (value.isMonthCard ? 10 : 5) && value.maxSteps === (value.isMonthCard ? 10 : 8);
async function getBackendTaskConfig(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "get_players_id_tasks", {
		path: { id: uid },
		requestId: request?.requestId
	});
	if (!record(data) || typeof data.version !== "string" || !data.version || !validConfig(data.config) || !validLimits(data)) throw new Error("任务配置接口返回不完整");
	return data;
}
async function getBackendTaskConfigLimits(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "get_players_id_tasks_limits", {
		path: { id: uid },
		requestId: request?.requestId
	});
	if (!validLimits(data)) throw new Error("任务权益接口返回不完整");
	return data;
}
async function getBackendTaskConfigPage(bid, uid, request) {
	const state = await getBackendTaskConfig(bid, uid, request);
	return {
		config: state.config,
		limits: {
			slotCount: state.slotCount,
			maxSteps: state.maxSteps,
			isMonthCard: state.isMonthCard
		}
	};
}
function validateBackendTaskConfigPage(value) {
	if (!record(value) || !validConfig(value.config) || !validLimits(value.limits)) throw new Error("任务展示配置响应不完整");
	return value;
}

//#endregion
export { getBackendTaskConfig, getBackendTaskConfigLimits, getBackendTaskConfigPage, validLimits, validateBackendTaskConfigPage };