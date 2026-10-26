import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/task-runtime-cancel.ts
async function cancelBackendTaskRuntime(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseBackendTaskRuntimeCancel(await requestBackend(bid, "delete_players_id_tasks_runtime", {
		path: { id: uid },
		...context
	}));
}
function parseBackendTaskRuntimeCancel(value) {
	const data = value;
	if (!data || typeof data !== "object" || Array.isArray(data) || data.cleared !== true) throw new Error("任务取消响应不完整");
	return data;
}

//#endregion
export { cancelBackendTaskRuntime, parseBackendTaskRuntimeCancel };