import { requestBackend } from "./client.js";
import { visitedPlotActions } from "../../response/cavePlot/capabilities.js";
import { parseBackendCaveOverview } from "./cave-overview-queries.js";

//#region src/api/bot/cave-visit-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("洞府访问接口返回格式不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("洞府访问接口缺少文本");
	return value;
}
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("洞府访问接口缺少整数");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("洞府访问接口缺少状态");
	return value;
}
function visitCapability(value) {
	const row = record(value);
	const kind = text(row.kind);
	if (![
		"collaborate",
		"collaborateHarvest",
		"steal"
	].includes(kind)) throw new Error("洞府访问接口能力无效");
	const careAction = row.careAction === void 0 ? void 0 : text(row.careAction);
	if (careAction !== void 0 && ![
		"water",
		"worm",
		"weed"
	].includes(careAction)) throw new Error("洞府访问接口照料能力无效");
	if (kind === "collaborate" !== (careAction !== void 0)) throw new Error("洞府访问接口能力参数不一致");
	return {
		kind,
		careAction
	};
}
function visitPlot(plot, ownerUid, capabilities) {
	const actions = visitedPlotActions(plot, ownerUid, capabilities);
	return {
		plotIndex: plot.plotIndex,
		plotState: plot.plotState,
		title: plot.title,
		detail: plot.detail,
		actionLabel: actions[0]?.label,
		actionCommand: actions[0]?.command,
		actions
	};
}
function parseBackendCaveVisit(value) {
	const data = record(value);
	const ownerUid = integer(data.ownerId);
	if (ownerUid < 1) throw new Error("洞府访问接口田主无效");
	const relation = text(data.relation);
	if (![
		"self",
		"companion",
		"friend",
		"stranger"
	].includes(relation)) throw new Error("洞府访问接口关系无效");
	const typedRelation = relation;
	const canViewPlots = boolean(data.canViewPlots);
	const canCollaborate = boolean(data.canCollaborate);
	const canSteal = boolean(data.canSteal);
	const relationLabel = text(data.relationLabel);
	const auraText = text(data.auraText);
	const summaryText = text(data.summaryText);
	const stolenStatusText = text(data.stolenStatusText);
	const recentLogs = data.recentLogs;
	if (!Array.isArray(recentLogs) || recentLogs.length > 1 || !recentLogs.every((value) => typeof value === "string")) throw new Error("洞府访问接口记录无效");
	const capabilitiesValue = data.capabilities;
	if (!Array.isArray(capabilitiesValue)) throw new Error("洞府访问接口缺少能力列表");
	const capabilities = capabilitiesValue.map(visitCapability);
	if (canCollaborate !== capabilities.some((item) => item.kind === "collaborate" || item.kind === "collaborateHarvest") || canSteal !== capabilities.some((item) => item.kind === "steal")) throw new Error("洞府访问接口操作资格不一致");
	const summary = data.summary === void 0 || data.summary === null ? void 0 : parseBackendCaveOverview(data.summary);
	if (canViewPlots !== Boolean(summary)) throw new Error("洞府访问接口地块可见范围不一致");
	return {
		ownerUid,
		ownerName: text(data.ownerName),
		relation: typedRelation,
		relationLabel,
		canViewPlots,
		canCollaborate,
		canSteal,
		auraText,
		auraDetailLines: void 0,
		summary: summaryText,
		stolenStatusText,
		cultivatedCount: summary?.cultivatedCount ?? 0,
		plantedCount: summary?.plantedCount ?? 0,
		matureCount: summary?.matureCount ?? 0,
		plots: summary ? summary.plots.map((plot) => visitPlot(plot, ownerUid, capabilities)) : [],
		recentLogs
	};
}
async function getBackendCaveVisit(bid, uid, ownerUid) {
	if (!bid) throw new Error("查询缺少平台身份");
	if (!Number.isSafeInteger(ownerUid) || ownerUid < 1) throw new Error("目标道友无效");
	return parseBackendCaveVisit(await requestBackend(bid, "get_players_id_cave_visit_ownerId", { path: {
		id: uid,
		ownerId: ownerUid
	} }));
}

//#endregion
export { getBackendCaveVisit, parseBackendCaveVisit };