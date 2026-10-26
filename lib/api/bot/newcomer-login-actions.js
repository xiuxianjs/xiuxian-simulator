import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/newcomer-login-actions.ts
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("新人活动领取响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`新人活动领取响应缺少${field}`);
	return value;
}
function loginClaim(value) {
	const row = object(value);
	if (typeof row.code !== "string" || ![
		"OK",
		"INVALID_USER",
		"OUT_OF_PERIOD",
		"ALL_CLAIMED",
		"NO_CLAIMABLE",
		"ALREADY_CLAIMED",
		"CONFIG_MISSING"
	].includes(row.code)) throw new Error("新人活动领取响应缺少code");
	const result = { code: row.code };
	if (row.claimDay !== void 0) result.claimDay = integer(row.claimDay, "claimDay");
	if (row.spiritCrystal !== void 0) result.spiritCrystal = integer(row.spiritCrystal, "spiritCrystal");
	if (row.grantedItems !== void 0) {
		if (!Array.isArray(row.grantedItems) || !row.grantedItems.every((item) => typeof item === "string")) throw new Error("新人活动领取奖励无效");
		result.grantedItems = row.grantedItems;
	}
	return result;
}
function taskClaim(value) {
	const row = object(value);
	if (typeof row.code !== "string" || ![
		"OK",
		"INVALID_TASK_ID",
		"INVALID_USER",
		"OUT_OF_PERIOD",
		"TASK_NOT_FOUND",
		"NOT_UNLOCKED",
		"INSUFFICIENT_PROGRESS",
		"ALREADY_CLAIMED"
	].includes(row.code)) throw new Error("新人任务领取响应缺少code");
	const result = { code: row.code };
	for (const field of [
		"spiritCrystal",
		"vipExpYuan",
		"required",
		"current"
	]) if (row[field] !== void 0) result[field] = integer(row[field], field);
	for (const field of ["taskLabel", "unit"]) if (row[field] !== void 0) {
		if (typeof row[field] !== "string") throw new Error(`新人任务领取响应缺少${field}`);
		result[field] = row[field];
	}
	return result;
}
async function claimBackendNewcomerLogin(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("新人活动领取参数无效");
	return loginClaim(await requestBackend(bid, "post_players_id_activities_newcomer_login_claim", {
		headers: repeatPresentationHeaders("初入仙途签到"),
		path: { id: uid },
		...writeContext(request)
	}));
}
async function claimBackendNewcomerTask(bid, uid, taskConfigId, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(taskConfigId) || taskConfigId <= 0) throw new Error("新人任务领取参数无效");
	return taskClaim(await requestBackend(bid, "post_players_id_activities_newcomer_login_tasks_taskId_claim", {
		headers: repeatPresentationHeaders("新人任务领取"),
		path: {
			id: uid,
			taskId: taskConfigId
		},
		...writeContext(request)
	}));
}

//#endregion
export { claimBackendNewcomerLogin, claimBackendNewcomerTask };