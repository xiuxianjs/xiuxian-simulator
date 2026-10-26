import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { parseDungeon, parseStatus } from "./seclusion-status.js";

//#region src/api/bot/seclusion-command.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("探索聚合响应不完整");
	return value;
}
async function executeBackendSeclusionCommand(bid, uid, action, input = {}, request, load) {
	if (!bid) throw new Error("探索请求缺少平台身份");
	let value;
	try {
		value = row(load ? await load() : await requestBackend(bid, "post_players_id_seclusion_command", {
			path: { id: uid },
			body: {
				action,
				...input
			},
			...action === "start" ? writeContext(request) : request ? { requestId: request.requestId } : {}
		}));
	} catch (error) {
		return {
			access: { canUseSoulPath: false },
			result: {
				code: "LOAD_FAILED",
				data: { message: action === "view" ? "查看探索状态失败，请稍后再试" : action === "select" ? "查看失败，请稍后再试" : error instanceof BackendAPIError ? error.message : "探索失败，请稍后再试" }
			}
		};
	}
	return parseSeclusionCommand(value, action);
}
function parseSeclusionCommand(input, action) {
	const value = row(input);
	const access = row(value.access), data = row(value.data);
	if (typeof access.canUseSoulPath !== "boolean") throw new Error("探索境界资格响应不完整");
	let result;
	if (value.code === "LOAD_FAILED" || action === "select" && value.code === "DUNGEON_NOT_FOUND") {
		if (typeof data.message !== "string") throw new Error("探索错误说明缺失");
		result = {
			code: value.code,
			data: { message: data.message }
		};
	} else if (action === "view" && value.code === "OK") result = {
		code: "OK",
		data: parseStatus(data.status)
	};
	else if (action === "select" && value.code === "IN_SECLUSION") result = {
		code: "IN_SECLUSION",
		data: { status: parseStatus(data.status) }
	};
	else if (action === "select" && value.code === "OK") result = {
		code: "OK",
		data: {
			status: parseStatus(data.status),
			dungeon: parseDungeon(data.dungeon, 0)
		}
	};
	else if (action === "start" && value.code === "OK") {
		const dungeon = row(data.dungeon), record = row(data.record);
		if (typeof dungeon.id !== "number" || typeof dungeon.name !== "string" || typeof record.duration !== "number" || typeof record.spiritCost !== "number") throw new Error("探索开始响应不完整");
		result = {
			code: "OK",
			data: {
				dungeon: {
					id: dungeon.id,
					name: dungeon.name
				},
				record: {
					duration: record.duration,
					spiritCost: record.spiritCost,
					endTime: typeof record.endTime === "string" ? record.endTime : void 0
				}
			}
		};
	} else throw new Error("探索聚合响应状态无效");
	return {
		access: { canUseSoulPath: access.canUseSoulPath },
		result
	};
}

//#endregion
export { executeBackendSeclusionCommand, parseSeclusionCommand };