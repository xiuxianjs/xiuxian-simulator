import { getWorkerBackendConfig } from "./config.js";
import { backendConnectionPools } from "./connection-pools.js";
import { BackendAPIError } from "./client.js";
import axios from "axios";

//#region src/api/bot/daily-fortune.ts
function dailyFortuneTarget(event) {
	const target = event.Target;
	const botId = target?.BotId ?? event.BotId;
	if (event.name.startsWith("private.") || event.IsPrivate || event.isPrivate || target?.scope !== "group" || !botId || !target.targetId) throw new BackendAPIError("每日机缘仅限群内使用。", "DAILY_FORTUNE_GROUP_REQUIRED", 400);
	return {
		platform: event.Platform,
		BotId: botId,
		scope: "group",
		targetId: target.targetId
	};
}
async function configureDailyFortune(event, enabled) {
	if (!event.IsMaster) throw new BackendAPIError("仅机器人 master 可以开启或关闭每日机缘。", "DAILY_FORTUNE_MASTER_REQUIRED", 403);
	const target = dailyFortuneTarget(event);
	const config = getWorkerBackendConfig();
	if (!config.url || !config.workerToken) throw new BackendAPIError("每日机缘管理 API 未配置。", "DAILY_FORTUNE_CONFIG_MISSING", 400);
	await axios.post(`${config.url}/api/v1/internal/daily-fortune/settings`, {
		target,
		enabled,
		actor: event.UserId
	}, {
		...backendConnectionPools,
		timeout: config.timeoutMs,
		headers: { "X-Worker-Token": config.workerToken }
	});
}
function parseDailyFortune(value) {
	if (!value || typeof value !== "object") throw new Error("每日机缘结果无效。");
	const row = value;
	if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || typeof row.alreadyClaimed !== "boolean" || typeof row.tier !== "string" || !row.tier || ![
		"poolVersion",
		"spiritStone",
		"spiritCrystal",
		"mentalPills",
		"qiPills"
	].every((key) => Number.isSafeInteger(row[key]) && Number(row[key]) > 0)) throw new Error("每日机缘结果无效。");
	return row;
}

//#endregion
export { configureDailyFortune, dailyFortuneTarget, parseDailyFortune };