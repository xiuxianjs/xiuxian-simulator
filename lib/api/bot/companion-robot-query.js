import { parseBackendGiftRecords } from "./queries.js";
import { parseCompanionInfo } from "./companion-info-queries.js";
import { parseCompanionTasks } from "./companion-tasks-queries.js";
import { presentCompanionInfo, presentCompanionTasks } from "../../utils/companionQueryPresentation.js";
import { presentGiftRecords } from "../../utils/giftRecordPresentation.js";

//#region src/api/bot/companion-robot-query.ts
function parseRobotCompanionInfo(value) {
	const out = presentCompanionInfo(parseCompanionInfo(value));
	if (out.code !== "OK") throw new Error("道侣接口数据不完整");
	return out.data;
}
function parseRobotCompanionTasks(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣任务数据不完整");
	const data = value;
	if (data.mode === "auto-claim-hint") {
		if (typeof data.message !== "string" || !data.message) throw new Error("道侣任务数据不完整");
		return {
			code: "AUTO_CLAIM_HINT",
			data: { message: data.message }
		};
	}
	if (data.mode !== "tasks") throw new Error("道侣任务数据不完整");
	const out = presentCompanionTasks(parseCompanionTasks(value), "");
	if (out.code !== "OK") throw new Error("道侣任务数据不完整");
	return out;
}
function parseRobotGiftRecords(value, mode) {
	return presentGiftRecords(parseBackendGiftRecords(value), mode);
}

//#endregion
export { parseRobotCompanionInfo, parseRobotCompanionTasks, parseRobotGiftRecords };