import { getBackendConfig } from "../api/bot/config.js";
import { createBackendRequestContext, getEventTransportDiagnosticContext } from "../api/bot/context.js";
import { getCurrentEvent, logger } from "alemonjs";

//#region src/utils/transportTiming.ts
const starts = /* @__PURE__ */ new WeakMap();
const sequences = /* @__PURE__ */ new WeakMap();
/** Processing begins here; upstream QQ queue time is outside this measurement. */
function startTransportEvent(event) {
	starts.set(event, performance.now());
	transportCheckpoint("event.received", event);
}
/** Offsets share the processor-start origin; inclusive spans can overlap and must not be added. */
function transportEventOffset(event, at = performance.now()) {
	const origin = event ? starts.get(event) : void 0;
	return origin === void 0 ? void 0 : Number((at - origin).toFixed(3));
}
function isHomeTimingEvent(event = getCurrentEvent()) {
	return getEventTransportDiagnosticContext(event)?.commandKey === "home.overview";
}
function isLearnedBooksTimingEvent(event = getCurrentEvent()) {
	return getEventTransportDiagnosticContext(event)?.commandKey === "skill-books.learned";
}
function isDetailedTimingEvent(event = getCurrentEvent()) {
	return isHomeTimingEvent(event) || isLearnedBooksTimingEvent(event);
}
/** Local logger only; inclusive spans overlap and must not be summed. */
function recordTransportStage(stage, startedAt, finishedAt, outcome, event = getCurrentEvent()) {
	try {
		if (process.env.NODE_ENV === "production" && !isLearnedBooksTimingEvent(event)) return;
		const durationMs = Number((finishedAt - startedAt).toFixed(3));
		if (!isDetailedTimingEvent(event) && !getBackendConfig().logTransportTimings && durationMs < 2e3) return;
		const spanSequence = event ? (sequences.get(event) ?? 0) + 1 : void 0;
		if (event && spanSequence) sequences.set(event, spanSequence);
		logger.info("[传输耗时]", {
			stage,
			requestId: event ? createBackendRequestContext(event).requestId : void 0,
			...getEventTransportDiagnosticContext(event),
			durationMs,
			outcome,
			spanSequence,
			startedFromEventStartMs: transportEventOffset(event, startedAt),
			elapsedFromEventStartMs: transportEventOffset(event, finishedAt)
		});
	} catch {}
}
/** A milestone carries an offset, not a duration for work preceding it. */
function transportCheckpoint(stage, event = getCurrentEvent()) {
	if (!isDetailedTimingEvent(event)) return;
	const now = performance.now();
	recordTransportStage(stage, now, now, "checkpoint", event);
}
async function measureTransportStage(stage, execute, event = getCurrentEvent()) {
	const startedAt = performance.now();
	let outcome = "rejected";
	try {
		const result = await execute();
		outcome = "fulfilled";
		return result;
	} finally {
		try {
			recordTransportStage(typeof stage === "function" ? stage() : stage, startedAt, performance.now(), outcome, event);
		} catch {}
	}
}
function measureTransportStageSync(stage, execute, event = getCurrentEvent()) {
	const startedAt = performance.now();
	let outcome = "rejected";
	try {
		const result = execute();
		outcome = "fulfilled";
		return result;
	} finally {
		try {
			recordTransportStage(typeof stage === "function" ? stage() : stage, startedAt, performance.now(), outcome, event);
		} catch {}
	}
}

//#endregion
export { isDetailedTimingEvent, isHomeTimingEvent, isLearnedBooksTimingEvent, measureTransportStage, measureTransportStageSync, recordTransportStage, startTransportEvent, transportCheckpoint, transportEventOffset };