import { requestBackend, writeContext } from "./client.js";
import { validateBackendTaskConfigPage } from "./task-config.js";

//#region src/api/bot/task-config-action.ts
function valid(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const data = value;
	return typeof data.outcome === "string" && [
		"saved",
		"invalid_slot",
		"invalid_step",
		"empty",
		"too_long",
		"nested",
		"out_of_order",
		"alias_too_long"
	].includes(data.outcome) && typeof data.alias === "string" && Array.isArray(data.steps) && data.steps.every((step) => typeof step === "string");
}
async function setBackendTaskSlotStep(bid, uid, slot, step, content, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "post_players_id_tasks_slots_slot_steps", {
		path: {
			id: uid,
			slot
		},
		body: {
			step,
			content
		},
		...writeContext(request)
	});
	if (!valid(data)) throw new Error("任务步骤设置响应不完整");
	if (data.page !== void 0) validateBackendTaskConfigPage(data.page);
	return data;
}
async function setBackendTaskSlotAlias(bid, uid, slot, alias, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = await requestBackend(bid, "put_players_id_tasks_slots_slot_alias", {
		path: {
			id: uid,
			slot
		},
		body: { alias },
		...writeContext(request)
	});
	if (!valid(data)) throw new Error("任务别名设置响应不完整");
	if (data.page !== void 0) validateBackendTaskConfigPage(data.page);
	return data;
}

//#endregion
export { setBackendTaskSlotAlias, setBackendTaskSlotStep };