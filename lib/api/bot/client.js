import { SDKError } from "../core/error.js";
import { isParameterRecord } from "../core/helpers.js";
import { assertChannelRobotEvent, getBackendConfig } from "./config.js";
import { backendConnectionPools } from "./connection-pools.js";
import { UNKNOWN_BATTLE_RESULT, backendRequestTimeout, backendTransportOperation, isBattleOperation } from "./battle-request.js";
import { getCommandErrorMessage } from "../../utils/commandError.js";
import { createBackendRequestContext, getEventTransportDiagnosticContext } from "./context.js";
import { isDetailedTimingEvent, isLearnedBooksTimingEvent, measureTransportStageSync, recordTransportStage, transportEventOffset } from "../../utils/transportTiming.js";
import { operationDefinitions } from "../registry.js";
import { createClient } from "../core/client.js";
import "../core/index.js";
import { invalidateEventAccessFacts } from "./access-facts.js";
import { receiveRepeatPresentation } from "./repeat-presentation.js";
import { normalizeRobotBid } from "./robot-bid.js";
import { getCurrentEvent, logger } from "alemonjs";

//#region src/api/bot/client.ts
const eventRequestTimings = /* @__PURE__ */ new WeakMap();
var BackendAPIError = class extends SDKError {
	constructor(message, code = "SDK_ERROR", status, requestId, details) {
		super(message, {
			code,
			status,
			requestId,
			details
		});
		this.name = "BackendAPIError";
	}
};
function writeContext(request) {
	if (!request?.idempotencyKey) throw new Error("当前平台消息缺少唯一标识，无法安全提交写操作");
	return {
		requestId: request.requestId,
		idempotencyKey: request.idempotencyKey
	};
}
function writeTraceContext(request) {
	if (!request?.idempotencyKey) throw new Error("当前平台消息缺少唯一标识，无法安全提交写操作");
	return { requestId: request.requestId };
}
async function requestBackend(bid, operationId, ...args) {
	const config = getBackendConfig();
	if (!config.url || !config.robotAuthToken) throw new Error("后端 API 未配置");
	const transportOperation = backendTransportOperation(operationId, args[0]);
	const startedAt = performance.now();
	let outcome = "error";
	const event = getCurrentEvent();
	if (event) assertChannelRobotEvent(event);
	if (event && operationDefinitions[operationId].method !== "GET") invalidateEventAccessFacts(event);
	const actorPath = args[0]?.path;
	const actorUid = actorPath && "id" in actorPath ? actorPath.id : actorPath && "playerId" in actorPath ? actorPath.playerId : event && "uid" in event ? event.uid : void 0;
	const requestId = args[0]?.requestId ?? (event ? createBackendRequestContext(event).requestId : void 0);
	const tracedArgs = requestId && (args[0] === void 0 || isParameterRecord(args[0])) ? [{
		...args[0],
		requestId
	}] : args;
	const eventTiming = event ? eventRequestTimings.get(event) ?? {
		sequence: 0,
		active: 0,
		totalMs: 0,
		startedAt
	} : void 0;
	const requestSequence = eventTiming ? ++eventTiming.sequence : void 0;
	const concurrentRequestsAtStart = eventTiming ? ++eventTiming.active : void 0;
	if (event && eventTiming) eventRequestTimings.set(event, eventTiming);
	try {
		const normalizedBid = normalizeRobotBid(bid);
		const timeoutMs = backendRequestTimeout(transportOperation, config.timeoutMs);
		let timedArgs = tracedArgs;
		if (operationId === "post_robot_command_entry" && new Headers(tracedArgs[0]?.headers).get("X-Command-Catalog") === "v1") {
			const headers = new Headers(tracedArgs[0]?.headers);
			headers.set("X-Command-Catalog-Timeout-Ms", String(timeoutMs));
			timedArgs = [{
				...tracedArgs[0],
				headers
			}];
		}
		const buildClient = () => createClient({
			baseUrl: config.url,
			onTiming: isDetailedTimingEvent(event) ? (stage, start, end, outcome) => recordTransportStage(stage, start, end, outcome, event) : void 0,
			connectionPools: backendConnectionPools,
			onPresentation: (value) => receiveRepeatPresentation(event, normalizedBid, actorUid, value),
			identity: {
				kind: "robot",
				token: config.robotAuthToken,
				bid: normalizedBid
			},
			timeoutMs
		});
		const result = await (isDetailedTimingEvent(event) ? measureTransportStageSync("api.client.create", buildClient, event) : buildClient()).request(operationId, ...timedArgs);
		outcome = "success";
		return result;
	} catch (error) {
		if (error instanceof SDKError) {
			if (error.code === "SDK_ROBOT_BID_INVALID") logger.warn("机器人请求缺少有效玩家标识", {
				operationId,
				platform: event?.Platform,
				event: event?.name,
				userIdType: typeof bid,
				userIdLength: typeof bid === "string" ? bid.length : void 0,
				missing: bid === void 0 || bid === null || bid === "",
				hasWhitespace: typeof bid === "string" && bid.trim() !== bid,
				hasComma: typeof bid === "string" && bid.includes(","),
				hasNonASCII: typeof bid === "string" && /[^\x20-\x7e]/.test(bid)
			});
			const message = isBattleOperation(transportOperation) && [
				"SDK_TIMEOUT",
				"SDK_NETWORK_ERROR",
				"SDK_ABORTED",
				"SDK_INVALID_RESPONSE"
			].includes(error.code) ? UNKNOWN_BATTLE_RESULT : isBattleOperation(transportOperation) ? getCommandErrorMessage(error) : error.message;
			throw new BackendAPIError(message, error.code, error.status, error.requestId, error.details);
		}
		throw error;
	} finally {
		if (event && operationDefinitions[operationId].method !== "GET") invalidateEventAccessFacts(event);
		const finishedAt = performance.now();
		const durationMs = Number((finishedAt - startedAt).toFixed(3));
		if (eventTiming) {
			eventTiming.active--;
			eventTiming.totalMs += durationMs;
		}
		try {
			if (process.env.NODE_ENV !== "production" && (isDetailedTimingEvent(event) || config.logApiTimings || durationMs >= 2e3) || isLearnedBooksTimingEvent(event)) logger.info("[后端请求耗时]", {
				operationId,
				requestId,
				...getEventTransportDiagnosticContext(event),
				durationMs,
				outcome,
				requestSequence,
				concurrentRequestsAtStart,
				cumulativeRequestMs: eventTiming?.totalMs,
				startedFromEventStartMs: transportEventOffset(event, startedAt),
				elapsedFromEventStartMs: transportEventOffset(event, finishedAt),
				elapsedFromFirstRequestMs: eventTiming ? Math.round(finishedAt - eventTiming.startedAt) : void 0
			});
		} catch {}
	}
}

//#endregion
export { BackendAPIError, requestBackend, writeContext, writeTraceContext };