import { withBackendRepeatDetection } from "../../../utils/backendRepeatDetector.js";
import { queryBackendBattleLog } from "../../../api/bot/battle-log-query.js";

//#region src/response-apps/battle/viewLog/app.ts
/**
* 查看战斗过程 - 业务逻辑层
*/
async function App(params) {
	const { uid, logId, messageText } = params;
	if (!logId) return { code: "MISSING_ID" };
	try {
		const { text: battleLog, readFailed, memoryShare } = await queryBackendBattleLog(params.bid, uid, logId, messageText);
		if (readFailed) return {
			code: "FAIL",
			data: { message: "查看战斗过程失败：战斗日志服务暂不可用" }
		};
		if (!battleLog && memoryShare) return { code: "MEMORY_ONLY" };
		if (!battleLog) return {
			code: "NOT_FOUND",
			data: { message: await withBackendRepeatDetection(params.bid, uid, messageText, "战斗日志不存在或已过期（战斗日志保存5分钟）", params.request) }
		};
		return {
			code: "OK",
			data: { log: battleLog }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? `查看战斗过程失败：${error.message}` : "查看战斗过程失败" }
		};
	}
}

//#endregion
export { App as default };