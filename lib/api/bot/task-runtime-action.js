import { requestBackend, writeContext } from "./client.js";
import { validateBackendTaskConfigPage } from "./task-config.js";

//#region src/api/bot/task-runtime-action.ts
const optionalText = (value) => value === void 0 || typeof value === "string";
const optionalIndex = (value) => value === void 0 || typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 10;
async function runBackendTaskRuntimeAction(bid, uid, action, input, slot, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const body = { action };
	if (input !== void 0) body.input = input;
	if (slot !== void 0) body.slot = slot;
	return parseBackendTaskRuntimeAction(await requestBackend(bid, "post_players_id_tasks_runtime_actions", {
		path: { id: uid },
		query: { page: true },
		body,
		...writeContext(request)
	}));
}
function parseBackendTaskRuntimeAction(value) {
	const data = value;
	if (!data || typeof data !== "object" || Array.isArray(data) || ![
		"started",
		"next",
		"completed",
		"expected",
		"current",
		"not_running",
		"invalid_runtime",
		"empty_slot",
		"invalid_slot"
	].includes(data.outcome) || !optionalText(data.command) || !optionalText(data.executed) || !optionalText(data.message) || !optionalIndex(data.slot) || !optionalIndex(data.step)) throw new Error("任务运行状态机响应不完整");
	if (data.page !== void 0) validateBackendTaskConfigPage(data.page);
	return data;
}

//#endregion
export { parseBackendTaskRuntimeAction, runBackendTaskRuntimeAction };