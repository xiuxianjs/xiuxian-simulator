import { getCurrentEvent, logger } from 'alemonjs';
import { getBackendConfig } from '../api/bot/config';
import { createBackendRequestContext, getEventTransportDiagnosticContext } from '../api/bot/context';

const starts = new WeakMap<object, number>();
const sequences = new WeakMap<object, number>();

type TraceEvent = Parameters<typeof createBackendRequestContext>[0];

/** Processing begins here; upstream QQ queue time is outside this measurement. */
export function startTransportEvent(event: object): void {
  starts.set(event, performance.now());
  transportCheckpoint('event.received', event);
}

/** Offsets share the processor-start origin; inclusive spans can overlap and must not be added. */
export function transportEventOffset(event: object | undefined, at = performance.now()): number | undefined {
  const origin = event ? starts.get(event) : undefined;

  return origin === undefined ? undefined : Number((at - origin).toFixed(3));
}

export function isHomeTimingEvent(event: object | undefined = getCurrentEvent()): boolean {
  return getEventTransportDiagnosticContext(event)?.commandKey === 'home.overview';
}

export function isLearnedBooksTimingEvent(event: object | undefined = getCurrentEvent()): boolean {
  return getEventTransportDiagnosticContext(event)?.commandKey === 'skill-books.learned';
}

export function isDetailedTimingEvent(event: object | undefined = getCurrentEvent()): boolean {
  return isHomeTimingEvent(event) || isLearnedBooksTimingEvent(event);
}

/** Local logger only; inclusive spans overlap and must not be summed. */
export function recordTransportStage(
  stage: string,
  startedAt: number,
  finishedAt: number,
  outcome: string,
  event: TraceEvent | undefined = getCurrentEvent()
): void {
  try {
    // Keep this reported slow command observable in deployed production bots.
    if (process.env.NODE_ENV === 'production' && !isLearnedBooksTimingEvent(event)) {
      return;
    }
    const durationMs = Number((finishedAt - startedAt).toFixed(3));

    if (!isDetailedTimingEvent(event) && !getBackendConfig().logTransportTimings && durationMs < 2000) {
      return;
    }
    const spanSequence = event ? (sequences.get(event) ?? 0) + 1 : undefined;

    if (event && spanSequence) {
      sequences.set(event, spanSequence);
    }
    logger.info('[传输耗时]', {
      stage,
      requestId: event ? createBackendRequestContext(event).requestId : undefined,
      ...getEventTransportDiagnosticContext(event),
      durationMs,
      outcome,
      spanSequence,
      startedFromEventStartMs: transportEventOffset(event, startedAt),
      elapsedFromEventStartMs: transportEventOffset(event, finishedAt)
    });
  } catch {
    // Diagnostic failures never change the original result or error.
  }
}

/** A milestone carries an offset, not a duration for work preceding it. */
export function transportCheckpoint(stage: string, event: TraceEvent | undefined = getCurrentEvent()): void {
  if (!isDetailedTimingEvent(event)) {
    return;
  }
  const now = performance.now();

  recordTransportStage(stage, now, now, 'checkpoint', event);
}

export async function measureTransportStage<T>(
  stage: string | (() => string),
  execute: () => Promise<T>,
  event: TraceEvent | undefined = getCurrentEvent()
): Promise<T> {
  const startedAt = performance.now();
  let outcome = 'rejected';

  try {
    const result = await execute();

    outcome = 'fulfilled';

    return result;
  } finally {
    // Stage naming must also be unable to replace the operation's result.
    try {
      recordTransportStage(typeof stage === 'function' ? stage() : stage, startedAt, performance.now(), outcome, event);
    } catch {
      /* Optional diagnostics only. */
    }
  }
}

export function measureTransportStageSync<T>(stage: string | (() => string), execute: () => T, event: TraceEvent | undefined = getCurrentEvent()): T {
  const startedAt = performance.now();
  let outcome = 'rejected';

  try {
    const result = execute();

    outcome = 'fulfilled';

    return result;
  } finally {
    try {
      recordTransportStage(typeof stage === 'function' ? stage() : stage, startedAt, performance.now(), outcome, event);
    } catch {
      /* Optional diagnostics only. */
    }
  }
}
