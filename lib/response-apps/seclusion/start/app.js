import { BackendAPIError, requestBackend, writeContext } from "../../../api/bot/client.js";
import "../../../api/index.js";

//#region src/response-apps/seclusion/start/app.ts
function parseStartedRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("探索开始响应不完整");
	const row = value;
	if (typeof row.duration !== "number" || typeof row.spiritCost !== "number") throw new Error("探索开始响应不完整");
	return {
		duration: row.duration,
		spiritCost: row.spiritCost,
		endTime: typeof row.endTime === "string" ? row.endTime : void 0
	};
}
async function App(params) {
	try {
		if (!params.bid) throw new Error("探索请求缺少平台身份");
		await requestBackend(params.bid, "post_players_id_seclusion_active_marker_repair", { path: { id: params.uid } });
		const value = await requestBackend(params.bid, "post_players_id_seclusion_start_by_name", {
			path: { id: params.uid },
			body: {
				dungeonName: params.dungeonName,
				duration: params.hours
			},
			...writeContext(params.request)
		});
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("探索开始响应不完整");
		const row = value;
		const dungeon = row.dungeon;
		if (!dungeon || typeof dungeon.id !== "number" || typeof dungeon.name !== "string") throw new Error("探索开始响应不完整");
		return {
			code: "OK",
			data: {
				dungeon: {
					id: dungeon.id,
					name: dungeon.name
				},
				record: parseStartedRecord(row.record)
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof BackendAPIError ? error.message : "探索失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };