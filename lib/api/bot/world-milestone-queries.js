import { requestBackend } from "./client.js";
import { requestBackendQueryPresentation } from "./query-presentation.js";

//#region src/api/bot/world-milestone-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("世界里程碑响应不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("世界里程碑数值字段不完整");
	return value;
}
function nullableNumber(value) {
	return value === null ? null : number(value);
}
function text(value) {
	if (typeof value !== "string") throw new Error("世界里程碑展示字段不完整");
	return value;
}
async function getBackendWorldMilestoneView(bid, uid, request) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid < 1) throw new Error("世界里程碑查询参数无效");
	return parseBackendWorldMilestoneView(request ? await requestBackendQueryPresentation(bid, uid, "world_milestones", "里程碑奖励", request) : await requestBackend(bid, "get_players_id_recharge_world_milestones", { path: { id: uid } }));
}
function parseBackendWorldMilestoneView(value) {
	const data = record(value);
	if (typeof data.empty !== "boolean" || !Array.isArray(data.milestones)) throw new Error("世界里程碑响应不完整");
	if (data.empty) return { code: "EMPTY" };
	return {
		code: "VIEW",
		worldCountText: text(data.worldCountText),
		nextMilestoneCount: nullableNumber(data.nextMilestoneCount),
		nextMilestoneGapText: text(data.nextMilestoneGapText),
		unclaimedCount: number(data.unclaimedCount),
		milestones: data.milestones.map((value) => {
			const milestone = record(value);
			return {
				milestoneCount: number(milestone.milestoneCount),
				status: text(milestone.statusText),
				rewardText: text(milestone.rewardText)
			};
		})
	};
}

//#endregion
export { getBackendWorldMilestoneView, parseBackendWorldMilestoneView };