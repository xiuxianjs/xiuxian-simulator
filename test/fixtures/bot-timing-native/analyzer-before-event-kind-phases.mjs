import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const stages = new Set(['platform.send', 'notification.platform.send', 'image.render', 'image.upload', 'image.cache.hit', 'image.cache.miss', 'image.cache.join', 'image.file_load', 'response.build', 'route.import']);
const finiteMs = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const sequence = value => Number.isSafeInteger(value) && value > 0 ? value : undefined;
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value);
const safeCommand = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/.test(value);
const safeOperation = value => typeof value === 'string' && (/^(get|post|put|patch|delete)_[a-zA-Z0-9_]{1,150}$/.test(value) || value === 'getRobotIdentity');
const producerCommands = new Set(['storyline.list', 'shop.list']);
const eventKinds = ['message', 'interaction', 'unknown'];
const phase = row => row.stage === 'route.import' ? 'route-import' : row.stage === 'response.build' ? 'response-build' : row.stage === 'image.file_load' ? 'file-preparation' : row.operationId ? row.operationId === 'post_robot_command_entry' ? 'entry' : 'business' : row.stage.startsWith('image.cache.') ? 'cache-wait-inclusive' : row.stage === 'image.render' ? 'render' : row.stage === 'image.upload' ? 'upload' : 'send-attempt';

// Inclusive spans overlap. Merge actual ranges; never add duration fields or
// cumulativeRequestMs (which explicitly includes concurrent requests).
export function unionIntervals(ranges) {
  const sorted = ranges.filter(([a, b]) => finiteMs(a) && finiteMs(b) && b >= a).map(range => [...range]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
const length = ranges => unionIntervals(ranges).reduce((total, [a, b]) => total + b - a, 0);
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
const p95 = values => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1] : null;

// Known JSONL logger envelopes only. Do not inspect SDK receipts, user text,
// arbitrary nested objects or event timestamps to manufacture missing stages.
function extract(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return undefined;
  for (const value of [record, record.data, ...(Array.isArray(record.args) ? record.args : [])]) {
    if (value && typeof value === 'object' && !Array.isArray(value) && (stages.has(value.stage) || safeOperation(value.operationId))) return value;
  }
}

export function analyzeBotTimings(jsonl, commandMappings = {}) {
  if (!commandMappings || typeof commandMappings !== 'object' || Array.isArray(commandMappings)) commandMappings = {};
  const events = new Map();
  const uncorrelated = [];
  const diagnostics = { inputLines: 0, invalidJsonLines: [], ignoredLines: 0, duplicateSpans: 0, unsafeRequestIds: 0, unsafeEventTraceIds: 0 };
  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    diagnostics.inputLines++;
    let record;
    try { record = JSON.parse(line); } catch { diagnostics.invalidJsonLines.push(index + 1); continue; }
    const value = extract(record);
    if (!value || !finiteMs(value.durationMs)) { diagnostics.ignoredLines++; continue; }
    const row = { line: index + 1, stage: stages.has(value.stage) ? value.stage : undefined, operationId: safeOperation(value.operationId) ? value.operationId : undefined,
      durationMs: value.durationMs, outcome: ['fulfilled', 'rejected', 'success', 'error'].includes(value.outcome) ? value.outcome : 'unknown',
      sequence: sequence(value.stage ? value.spanSequence : value.requestSequence) };
    if (finiteMs(value.startedFromEventStartMs) && finiteMs(value.elapsedFromEventStartMs) && value.elapsedFromEventStartMs >= value.startedFromEventStartMs) {
      row.startMs = value.startedFromEventStartMs;
      row.endMs = value.elapsedFromEventStartMs;
      // Integer rounding can differ by 1ms. Large inconsistencies are not
      // reconstructed from duration; retain only the standalone duration.
      if (Math.abs(row.endMs - row.startMs - row.durationMs) > 1) { delete row.startMs; delete row.endMs; row.invalidOrigin = true; }
    }
    row.phase = phase(row);
    if (!safeId(value.requestId)) {
      if (value.requestId !== undefined) diagnostics.unsafeRequestIds++;
      uncorrelated.push(row);
      continue;
    }
    const requestId = value.requestId;
    if (value.eventTraceId !== undefined && !safeId(value.eventTraceId)) {
      diagnostics.unsafeEventTraceIds++;
      uncorrelated.push(row);
      continue;
    }
    const eventTraceId = value.eventTraceId;
    const groupKey = eventTraceId ? `event:${eventTraceId}` : `request:${requestId}`;
    const commandKey = producerCommands.has(value.commandKey) ? value.commandKey : safeCommand(commandMappings[requestId]) ? commandMappings[requestId] : 'unknown';
    const eventKind = eventKinds.includes(value.eventKind) ? value.eventKind : 'unknown';
    const event = events.get(groupKey) ?? { requestId, eventTraceId, requestIds: new Set(), commandKey, eventKind, spans: [], keys: new Map(), ambiguousIdentity: false, ambiguousEventKind: false };
    if (event.eventKind === 'unknown') event.eventKind = eventKind;
    else if (eventKind !== 'unknown' && event.eventKind !== eventKind) event.ambiguousEventKind = true;
    event.requestIds.add(requestId);
    if (event.commandKey === 'unknown') event.commandKey = commandKey;
    else if (commandKey !== 'unknown' && event.commandKey !== commandKey) event.ambiguousIdentity = true;
    events.set(groupKey, event);
    const key = row.sequence === undefined ? undefined : `${row.operationId ? 'api' : 'transport'}:${row.sequence}`;
    if (key && event.keys.has(key)) {
      const previous = event.keys.get(key);
      const identity = item => JSON.stringify([item.stage, item.operationId, item.durationMs, item.outcome, item.startMs, item.endMs]);
      if (identity(previous) === identity(row)) { diagnostics.duplicateSpans++; continue; }
      event.ambiguousIdentity = true; // Message replay/shared ID or merged processes: do not fabricate event partitions.
    }
    if (key) event.keys.set(key, row);
    event.spans.push(row);
  }
  const samples = [];
  for (const event of events.values()) {
    const spans = event.spans.sort((a, b) => (a.startMs ?? Infinity) - (b.startMs ?? Infinity) || a.line - b.line);
    const complete = spans.filter(row => row.startMs !== undefined);
    const sends = complete.filter(row => row.phase === 'send-attempt');
    const missing = ['upstream-receive-and-queue-not-observable', 'user-display-not-observable', 'last-observed-send-is-not-proof-all-sends-completed'];
    if (event.commandKey === 'unknown') missing.push('command-unmapped');
    if (event.ambiguousIdentity) missing.push('ambiguous-event-identity-sequence-conflict');
    if (event.ambiguousEventKind) missing.push('conflicting-event-kind');
    if (spans.some(row => row.sequence === undefined)) missing.push('span-sequence-missing-cannot-detect-replay-or-shared-id');
    if (spans.some(row => row.startMs === undefined)) missing.push('processor-origin-offset-missing-or-inconsistent');
    if (!sends.length) missing.push('no-send-span-with-processor-origin');
    const endpointsUsable = !event.ambiguousIdentity && !event.ambiguousEventKind && sends.length && complete.length === spans.length && spans.every(row => row.sequence !== undefined);
    const observedLastSendEndMs = endpointsUsable ? Math.max(...sends.map(row => row.endMs)) : null;
    const windowRanges = observedLastSendEndMs === null ? [] : complete.filter(row => row.startMs <= observedLastSendEndMs).map(row => [row.startMs, Math.min(row.endMs, observedLastSendEndMs)]);
    const coverage = unionIntervals(windowRanges);
    const gaps = [];
    if (observedLastSendEndMs !== null) {
      let cursor = 0;
      for (const [a, b] of coverage) { if (a > cursor) gaps.push([cursor, a]); cursor = b; }
      if (cursor < observedLastSendEndMs) gaps.push([cursor, observedLastSendEndMs]);
    }
    const clipToSendWindow = rows => observedLastSendEndMs === null ? [] : rows.filter(row => row.startMs !== undefined && row.startMs <= observedLastSendEndMs).map(row => [row.startMs, Math.min(row.endMs, observedLastSendEndMs)]);
    const phases = Object.fromEntries(['entry', 'business', 'route-import', 'response-build', 'render', 'upload', 'cache-wait-inclusive', 'file-preparation', 'send-attempt'].map(name => {
      const rows = spans.filter(row => row.phase === name);
      return [name, { observedSpanCount: rows.length, knownOriginSpanCount: rows.filter(row => row.startMs !== undefined).length, unionMs: rows.some(row => row.startMs !== undefined) ? length(rows.filter(row => row.startMs !== undefined).map(row => [row.startMs, row.endMs])) : null,
        observedSendWindowUnionMs: observedLastSendEndMs !== null && rows.some(row => row.startMs !== undefined) ? length(clipToSendWindow(rows)) : null,
        state: rows.length ? 'observed' : 'not-observed-possibly-not-required' }];
    }));
    // Cache spans are parent/wait intervals, not an additional independent
    // bottleneck when render/upload occupy that same time.
    const joinRows = complete.filter(row => row.stage === 'image.cache.join');
    const candidates = Object.entries(phases).filter(([name, data]) => name !== 'cache-wait-inclusive' && data.knownOriginSpanCount > 0).sort((a, b) => b[1].unionMs - a[1].unionMs);
    if (joinRows.length) {
      candidates.push(['cache-join-wait', { unionMs: length(joinRows.map(row => [row.startMs, row.endMs])) }]);
      candidates.sort((a, b) => b[1].unionMs - a[1].unionMs);
    }
    const windowCandidates = Object.entries(phases).filter(([name, data]) => name !== 'cache-wait-inclusive' && data.observedSendWindowUnionMs !== null && data.observedSendWindowUnionMs > 0).map(([name, data]) => [name, data.observedSendWindowUnionMs]);
    if (observedLastSendEndMs !== null && joinRows.length) {
      const joinWindowMs = length(clipToSendWindow(joinRows));
      if (joinWindowMs > 0) windowCandidates.push(['cache-join-wait', joinWindowMs]);
    }
    windowCandidates.sort((a, b) => b[1] - a[1]);
    const sendState = spans.some(row => row.phase === 'send-attempt' && row.outcome === 'rejected') ? 'send-rejected-or-deadline' : sends.some(row => row.outcome === 'fulfilled') ? 'send-promise-fulfilled-receipt-and-display-unknown' : 'send-completion-not-observed';
    samples.push({ requestId: event.requestId, requestIds: [...event.requestIds], ...(event.eventTraceId ? {eventTraceId: event.eventTraceId} : {}), commandKey: event.commandKey, eventKind: event.ambiguousEventKind ? 'unknown' : event.eventKind, ambiguousEventKind: event.ambiguousEventKind, ambiguousIdentity: event.ambiguousIdentity, observedLastSendEndMs,
      measuredWindowUnionMs: observedLastSendEndMs === null ? null : length(windowRanges), unloggedIntervalsMs: gaps, phases, largestObservedIndependentPhase: candidates[0]?.[0] ?? null,
      largestObservedSendWindowPhase: windowCandidates[0]?.[0] ?? null, cacheWaitInclusiveMs: phases['cache-wait-inclusive'].unionMs, sendState, stageFailureObserved: spans.some(row => ['error', 'rejected'].includes(row.outcome)), missingBoundaries: missing, timeline: spans });
  }
  const commandKeys = [...new Set(samples.map(row => row.commandKey))].sort();
  const commands = commandKeys.map(commandKey => {
    const rows = samples.filter(row => row.commandKey === commandKey);
    const eligible = rows.filter(row => row.observedLastSendEndMs !== null);
    const stats = group => ({ samples: group.length, medianMs: median(group.map(row => row.observedLastSendEndMs)), p95Ms: p95(group.map(row => row.observedLastSendEndMs)) });
    const endpointStatsByEventKind = Object.fromEntries(eventKinds.map(eventKind => {
      const kindRows = rows.filter(row => row.eventKind === eventKind);
      const kindEligible = kindRows.filter(row => row.observedLastSendEndMs !== null);
      return [eventKind, { ...stats(kindEligible), correlatedEvents: kindRows.length, excludedFromEndpointStats: kindRows.length - kindEligible.length }];
    }));
    const phaseDistributions = Object.fromEntries(['entry', 'business', 'route-import', 'response-build', 'render', 'upload', 'cache-wait-inclusive', 'file-preparation', 'send-attempt'].map(name => {
      const values = eligible.map(row => row.phases[name].unionMs).filter(value => value !== null);
      return [name, { samples: values.length, medianMs: median(values), p95Ms: p95(values), boundary: 'Observed phase union only; phases overlap and are not additive.' }];
    }));
    const observedSendWindowPhaseDistributions = Object.fromEntries(Object.keys(phaseDistributions).map(name => {
      const values = eligible.map(row => row.phases[name].observedSendWindowUnionMs).filter(value => value !== null);
      return [name, { samples: values.length, medianMs: median(values), p95Ms: p95(values), boundary: 'Observed phase union clipped to processor origin through last observed send attempt end; phases overlap and are not additive.' }];
    }));
    const observedSendWindowBottleneckCandidates = Object.fromEntries([...new Set(eligible.map(row => row.largestObservedSendWindowPhase).filter(Boolean))].map(name => [name, eligible.filter(row => row.largestObservedSendWindowPhase === name).length]));
    const observedBottleneckCandidates = Object.fromEntries([...new Set(eligible.map(row => row.largestObservedIndependentPhase).filter(Boolean))].map(name => [name, eligible.filter(row => row.largestObservedIndependentPhase === name).length]));
    return { commandKey, endpointStatsByEventKind, phaseDistributions, observedSendWindowPhaseDistributions, observedSendWindowBottleneckCandidates, observedBottleneckCandidates, correlatedEvents: rows.length, correlatedRequestIds: new Set(rows.flatMap(row => row.requestIds)).size, excludedFromEndpointStats: rows.length - eligible.length, processorToObservedLastSendAttemptEnd: stats(eligible),
      sendPromiseFulfilledReceiptUnknown: stats(eligible.filter(row => row.sendState === 'send-promise-fulfilled-receipt-and-display-unknown')),
      observedStageFailure: stats(eligible.filter(row => row.stageFailureObserved)),
      rejectedOrDeadline: stats(eligible.filter(row => row.sendState === 'send-rejected-or-deadline')) };
  });
  return { schemaVersion: 2, diagnostics, commands, samples, uncorrelated,
    boundaries: ['Processor hook origin, not platform receive or queue origin.', 'Partial sampled logs; gaps and absent stages are unknown, not zero.', 'Interval unions avoid nested/cache/concurrent span addition; phase unions may overlap each other and are not additive.', 'Handler return is not send completion. Metrics end at the last observed send attempt, not a proven command or delivery completion.', 'Fulfilled SDK promise may contain an error receipt; receipts and user text are never read.', 'Notification rejection may be an application deadline while SDK still runs. Failure type cannot be inferred from duration.', 'New producers emit only fixed safe command categories; legacy/unknown commands without safe sidecar mapping stay unknown.', 'New eventTraceId groups diagnostic events without changing requestId; legacy requestId collisions/conflicting sequences remain excluded, and unidentifiable spans are excluded conservatively.', 'Legacy phase union/distributions/candidates include all observed spans, possibly after the observed send endpoint. Additive observedSendWindow fields clip to that endpoint and do not prove all sends or user delivery.', 'p95 is nearest rank; medians average the middle pair. Small samples do not establish stable production performance.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (!args[0] || args.some(arg => arg === '--help')) {
    process.stdout.write('Usage: node tools/analyze-bot-timings.mjs INPUT.jsonl [OUTPUT.json] [--commands SAFE_REQUEST_ID_TO_COMMAND_KEY.json]\nOnly timing fields are retained. Command keys are ASCII identifiers without message arguments; missing labels remain unknown.\n');
  } else {
    try {
    const index = args.indexOf('--commands');
    if (index >= 0 && !args[index + 1]) throw new Error('missing commands file');
    const mapping = index >= 0 ? JSON.parse(fs.readFileSync(args[index + 1], 'utf8')) : {};
    const output = args[1]?.startsWith('--') ? undefined : args[1];
    if (output && path.resolve(output) === path.resolve(args[0])) throw new Error('input must not be overwritten');
    const result = JSON.stringify(analyzeBotTimings(fs.readFileSync(args[0], 'utf8'), mapping), null, 2) + '\n';
    if (output) fs.writeFileSync(output, result); else process.stdout.write(result);
    } catch {
      // JSON parse exceptions can contain raw input. Never print them.
      process.stderr.write('Timing analysis failed: check input JSONL, command-mapping JSON and distinct output path.\n');
      process.exitCode = 1;
    }
  }
}
