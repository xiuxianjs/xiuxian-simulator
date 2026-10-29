import { requestBackend, writeContext } from "./client.js";
import { parseBackendCaveOverview } from "./cave-overview-queries.js";
import { parseBackendCaveVisit } from "./cave-visit-queries.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { appendMiddlewareAdvice } from "../../response/middlewareReply.js";
import { Format } from "alemonjs";

//#region src/api/bot/cave-command.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("灵田聚合响应不完整");
	return value;
}
async function getBackendCaveView(bid, uid) {
	return parseBackendCaveView(record(await requestBackend(bid, "get_players_id_cave_view", { path: { id: uid } })));
}
function parseBackendCaveView(value) {
	const data = record(value);
	const access = record(data.access);
	if (typeof access.canUseCave !== "boolean" || typeof access.lockedMessage !== "string" || access.realmName !== null && typeof access.realmName !== "string" || (access.canUseCave ? typeof access.hasCavePlot !== "boolean" : access.hasCavePlot !== null)) throw new Error("灵田资格响应不完整");
	return {
		access: {
			canUseCave: access.canUseCave,
			lockedMessage: access.lockedMessage,
			realmName: access.realmName,
			hasCavePlot: access.hasCavePlot
		},
		overview: data.overview ? parseBackendCaveOverview(data.overview) : null
	};
}
async function getBackendCavePlantQuery(bid, uid, plotIndex) {
	return parseBackendCavePlantQuery(record(await requestBackend(bid, "get_players_id_cave_plant_query", {
		path: { id: uid },
		query: { plotIndex: plotIndex ?? 0 }
	})));
}
function parseBackendCavePlantQuery(value) {
	const data = record(value);
	return {
		options: plantOptions(data.options),
		overview: parseBackendCaveOverview(data.overview)
	};
}
function plantOptions(value) {
	const data = record(value);
	if (!Number.isInteger(data.plotIndex) || !Number.isInteger(data.remainingPlots) || !Array.isArray(data.options)) throw new Error("播种聚合选项响应不完整");
	for (const value of data.options) {
		const option = record(value);
		if (typeof option.seedName !== "string" || typeof option.cropName !== "string" || typeof option.matureHours !== "number" || !Number.isFinite(option.matureHours) || !Number.isInteger(option.quantity)) throw new Error("播种聚合选项响应不完整");
	}
	return data;
}
async function executeBackendCaveCommand(bid, uid, body, request) {
	return parseBackendCaveCommand(record(await requestBackend(bid, "post_players_id_cave_command", {
		path: { id: uid },
		body,
		...writeContext(request)
	})));
}
function parseBackendCaveCommand(value) {
	const data = record(value);
	if (typeof data.message !== "string" || data.needsSeedSelection !== void 0 && typeof data.needsSeedSelection !== "boolean") throw new Error("灵田操作聚合响应不完整");
	return {
		message: data.message,
		ownerUid: typeof data.ownerUid === "number" ? data.ownerUid : null,
		snapshotError: typeof data.snapshotError === "string" ? data.snapshotError : null,
		needsSeedSelection: data.needsSeedSelection === true,
		overview: data.overview ? parseBackendCaveOverview(data.overview) : null,
		visit: data.visit ? parseBackendCaveVisit(data.visit) : null,
		options: data.options ? plantOptions(data.options) : null
	};
}
function sendCaveCommandFallback(result, bid, isPrivate, message, title, advice = []) {
	const md = Format.createMarkdown().addText(result.message);
	if (result.snapshotError) md.addNewline().addText(result.snapshotError);
	appendMiddlewareAdvice(md, advice);
	return message.send(FormatGui({
		bid,
		isPrivate,
		title,
		content: md,
		footer: [{
			label: "我的灵田",
			command: "/灵田"
		}]
	}));
}

//#endregion
export { executeBackendCaveCommand, getBackendCavePlantQuery, getBackendCaveView, parseBackendCaveCommand, parseBackendCavePlantQuery, parseBackendCaveView, sendCaveCommandFallback };