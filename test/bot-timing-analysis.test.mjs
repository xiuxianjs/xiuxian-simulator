import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzeBotTimings, unionIntervals } from '../tools/analyze-bot-timings.mjs';

const span = (id, stage, sequence, start, end, outcome = 'fulfilled') => ({ requestId: id, stage, spanSequence: sequence, startedFromEventStartMs: start, elapsedFromEventStartMs: end, durationMs: end - start, outcome });
const api = (id, op, sequence, start, end, outcome = 'success') => ({ requestId: id, operationId: op, requestSequence: sequence, startedFromEventStartMs: start, elapsedFromEventStartMs: end, durationMs: end - start, outcome, cumulativeRequestMs: 999999 });
const lines = rows => rows.map(value => JSON.stringify(value)).join('\n');

test('nested cache/render/upload and concurrent APIs produce a union timeline, not sums or handler completion', () => {
  const out = analyzeBotTimings(lines([
    { data: api('a', 'post_robot_command_entry', 1, 0, 30) },
    { args: ['[后端请求耗时]', api('a', 'getRobotIdentity', 2, 30, 70)] },
    api('a', 'get_players_id_shop', 3, 50, 90),
    span('a', 'image.cache.miss', 1, 90, 160),
    span('a', 'image.render', 2, 90, 120),
    span('a', 'image.upload', 3, 120, 160),
    { requestId: 'a', stage: 'event.handler.finished', durationMs: 120, elapsedFromEventStartMs: 120 },
    span('a', 'platform.send', 4, 170, 190)
  ]), { a: 'shop' });
  const sample = out.samples[0];
  assert.equal(sample.observedLastSendEndMs, 190);
  assert.equal(sample.measuredWindowUnionMs, 180);
  assert.equal(sample.phases.business.unionMs, 60);
  assert.equal(sample.cacheWaitInclusiveMs, 70);
  assert.deepEqual(sample.unloggedIntervalsMs, [[160, 170]]);
  assert.equal(sample.largestObservedIndependentPhase, 'business');
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.medianMs, 190);
  assert.equal(out.diagnostics.ignoredLines, 1);
});

test('cross-event image join has its own origin, does not acquire creator work or merge event IDs', () => {
  const out = analyzeBotTimings(lines([
    span('creator', 'image.cache.miss', 1, 0, 80), span('creator', 'image.render', 2, 0, 50), span('creator', 'image.upload', 3, 50, 80), span('creator', 'platform.send', 4, 90, 100),
    span('joiner', 'image.cache.join', 1, 10, 60), span('joiner', 'platform.send', 2, 70, 80),
    span('hit', 'image.cache.hit', 1, 0, 0), span('hit', 'platform.send', 2, 5, 10)
  ]), { creator: 'panel', joiner: 'panel', hit: 'panel' });
  assert.equal(out.samples.length, 3);
  const join = out.samples.find(row => row.requestId === 'joiner');
  assert.equal(join.phases.render.unionMs, null);
  assert.equal(join.largestObservedIndependentPhase, 'cache-join-wait');
  assert.equal(join.observedLastSendEndMs, 80);
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.samples, 3);
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.medianMs, 80);
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.p95Ms, 100);
});

test('failed APIs, SDK fulfilled receipts and notification deadline do not become successful delivery', () => {
  const out = analyzeBotTimings(lines([
    api('failure', 'getRobotIdentity', 1, 0, 30, 'error'),
    { ...span('failure', 'platform.send', 1, 40, 50), receipt: [{ code: 4000, message: 'PRIVATE-RECEIPT' }] },
    span('deadline', 'notification.platform.send', 1, 0, 30000, 'rejected')
  ]));
  assert.equal(out.samples[0].stageFailureObserved, true);
  assert.equal(out.samples[0].sendState, 'send-promise-fulfilled-receipt-and-display-unknown');
  assert.equal(out.samples[1].sendState, 'send-rejected-or-deadline');
  assert.doesNotMatch(JSON.stringify(out), /PRIVATE-RECEIPT|4000|delivered|userSeen/);
});

test('no request ID, legacy duration-only or offset inconsistency are not fabricated into event latency', () => {
  const out = analyzeBotTimings(lines([
    { stage: 'notification.platform.send', durationMs: 20, outcome: 'fulfilled' },
    { requestId: 'old', stage: 'platform.send', durationMs: 50, outcome: 'fulfilled', spanSequence: 1, elapsedFromEventStartMs: 70 },
    { ...span('bad', 'platform.send', 1, 0, 100), durationMs: 50 },
    { requestId: 'no-send', operationId: 'getRobotIdentity', durationMs: 3, outcome: 'success', requestSequence: 1 }
  ]));
  assert.equal(out.uncorrelated.length, 1);
  assert.ok(out.samples.every(row => row.observedLastSendEndMs === null));
  assert.ok(out.commands.every(row => row.processorToObservedLastSendAttemptEnd.samples === 0));
  assert.equal(out.samples[0].phases['send-attempt'].unionMs, null);
});

test('exact duplicate sequences deduplicate; conflicting replay/event identities do not enter endpoint distributions', () => {
  const first = span('replay', 'platform.send', 1, 10, 20);
  const out = analyzeBotTimings(lines([first, first, span('replay', 'platform.send', 1, 100, 150)]));
  assert.equal(out.diagnostics.duplicateSpans, 1);
  assert.equal(out.samples[0].ambiguousIdentity, true);
  assert.equal(out.samples[0].observedLastSendEndMs, null);
  assert.equal(out.commands[0].excludedFromEndpointStats, 1);
});

test('same-stage multiple sends use the last observed attempt end and do not assume there are no later sends', () => {
  const out = analyzeBotTimings(lines([span('multi', 'platform.send', 1, 10, 20), span('multi', 'platform.send', 2, 15, 30)]));
  assert.equal(out.samples[0].phases['send-attempt'].unionMs, 20);
  assert.equal(out.samples[0].observedLastSendEndMs, 30);
  assert.ok(out.samples[0].missingBoundaries.includes('last-observed-send-is-not-proof-all-sends-completed'));
  const unidentified = analyzeBotTimings(lines([{ ...span('multi', 'platform.send', undefined, 10, 20) }]));
  assert.equal(unidentified.samples[0].observedLastSendEndMs, null);
});

test('CLI normalizes JSONL envelopes, rejects raw messages/unsafe mappings and emits no private extras', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-timing-analysis-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'input.jsonl');
  const mapping = path.join(dir, 'commands.json');
  const output = path.join(dir, 'output.json');
  fs.writeFileSync(input, lines([{ ...span('safe', 'platform.send', 1, 10, 20), token: 'PRIVATE-TOKEN', MessageText: '/shop PRIVATE-MESSAGE', userId: 'PRIVATE-USER' }, { requestId: 'SECRET RAW', stage: 'platform.send', durationMs: 10, outcome: 'fulfilled' }]) + '\nPRIVATE-MALFORMED\n');
  fs.writeFileSync(mapping, JSON.stringify({ safe: 'shop PRIVATE-ARG' }));
  execFileSync(process.execPath, ['tools/analyze-bot-timings.mjs', input, output, '--commands', mapping]);
  const text = fs.readFileSync(output, 'utf8');
  const out = JSON.parse(text);
  assert.equal(out.samples[0].commandKey, 'unknown');
  assert.equal(out.diagnostics.unsafeRequestIds, 1);
  assert.deepEqual(out.diagnostics.invalidJsonLines, [3]);
  assert.doesNotMatch(text, /PRIVATE-|SECRET RAW|MessageText|token|userId/);
});

test('range union and nearest-rank p95 handle adjacent, overlapping and small samples', () => {
  assert.deepEqual(unionIntervals([[5, 10], [0, 6], [10, 20], [25, 30], [NaN, 1]]), [[0, 20], [25, 30]]);
  const out = analyzeBotTimings(lines([10, 20, 30, 40].map((end, i) => span(`event${i}`, 'platform.send', 1, 0, end))), { event0: 'shop', event1: 'shop', event2: 'shop', event3: 'shop' });
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.medianMs, 25);
  assert.equal(out.commands[0].processorToObservedLastSendAttemptEnd.p95Ms, 40);
});

test('CLI errors never echo malformed mapping secrets and never overwrite the input log', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-timing-invalid-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'input.jsonl');
  const mapping = path.join(dir, 'bad.json');
  const content = lines([span('safe', 'platform.send', 1, 0, 20)]);
  fs.writeFileSync(input, content);
  fs.writeFileSync(mapping, 'PRIVATE-MAPPING-TOKEN');
  for (const args of [[input, '--commands', mapping], [input, input]]) {
    assert.throws(() => execFileSync(process.execPath, ['tools/analyze-bot-timings.mjs', ...args], { stdio: 'pipe' }), error => {
      assert.doesNotMatch(String(error.stderr), /PRIVATE-MAPPING-TOKEN/);
      assert.match(String(error.stderr), /Timing analysis failed/);
      return true;
    });
  }
  assert.equal(fs.readFileSync(input, 'utf8'), content);
  assert.equal(analyzeBotTimings(content, null).samples[0].commandKey, 'unknown');
});
