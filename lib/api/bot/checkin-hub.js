import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/checkin-hub.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const status = (value) => value === "done" || value === "skip" || value === "error";
async function postBackendCheckInHub(bid, uid, request) {
	if (!bid?.trim()) throw new Error("签到缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid <= 0) throw new Error("签到玩家参数无效");
	return parseCheckInHub(await requestBackend(bid, "post_players_id_check_ins_hub", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseCheckInHub(data) {
	if (!record(data) || !Array.isArray(data.results)) throw new Error("统一签到响应不完整");
	return data.results.map((row) => {
		if (!record(row) || typeof row.name !== "string" || !status(row.status) || typeof row.message !== "string") throw new Error("统一签到回执字段不完整");
		return {
			name: row.name,
			status: row.status,
			message: row.message
		};
	});
}

//#endregion
export { parseCheckInHub, postBackendCheckInHub };