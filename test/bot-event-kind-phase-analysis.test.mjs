import assert from 'node:assert/strict';
import { test } from 'node:test';
import { format } from 'node:util';
import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';
import { analyzeBotTimings as before } from './fixtures/bot-timing-native/analyzer-before-event-kind-phases.mjs';
import { normalizeBotTimingLogs } from '../tools/normalize-bot-timing-logs.mjs';

const span = (eventTraceId, eventKind, stage, spanSequence, start, end) => ({
  requestId: 'shared-request', eventTraceId, commandKey: 'shop.list',
  ...(eventKind === undefined ? {} : { eventKind }), stage, spanSequence,
  durationMs: end - start, startedFromEventStartMs: start,
  elapsedFromEventStartMs: end, outcome: 'fulfilled'
});
const rows = [
  span('m1', 'message', 'response.build', 1, 0, 80),
  span('m1', 'message', 'response.build', 2, 10, 60),
  span('m1', 'message', 'platform.send', 3, 80, 90),
  span('m1', 'message', 'image.upload', 4, 100, 150),
  span('m2', 'message', 'response.build', 1, 0, 40),
  span('m2', 'message', 'platform.send', 2, 40, 50),
  span('i1', 'interaction', 'response.build', 1, 0, 5),
  span('i1', 'interaction', 'platform.send', 2, 5, 105),
  span('legacy', undefined, 'platform.send', 1, 0, 30),
  span('conflict', 'message', 'platform.send', 1, 0, 300),
  span('conflict', 'interaction', 'platform.send', 1, 0, 300),
  span('incomplete', 'message', 'response.build', 1, 0, 1000)
];
const jsonl = values => values.map(x => JSON.stringify(x)).join('\n');
const analyze = values => analyzeBotTimings(jsonl(values));
const stats = (samples, medianMs, p95Ms) => ({ samples, medianMs, p95Ms });
const short = value => ({ samples: value.samples, medianMs: value.medianMs, p95Ms: value.p95Ms });

test('same-kind phase distributions preserve per-event unions, clipping and different bottlenecks', () => {
  const command = analyze(rows).commands[0];
  const kinds = command.observedSendWindowPhaseDistributionsByEventKind;
  assert.deepEqual(short(kinds.message['response-build']), stats(2, 60, 80));
  assert.deepEqual(short(kinds.message['send-attempt']), stats(2, 10, 10));
  assert.deepEqual(short(kinds.interaction['response-build']), stats(1, 5, 5));
  assert.deepEqual(short(kinds.interaction['send-attempt']), stats(1, 100, 100));
  assert.deepEqual(short(command.observedSendWindowPhaseDistributions['response-build']), stats(3, 40, 80));
  // An observed upload after the send endpoint is clipped to no interval.
  assert.deepEqual(short(kinds.message.upload), stats(1, 0, 0));
  // A missing phase remains missing; legacy events stay in unknown.
  assert.deepEqual(short(kinds.unknown['response-build']), stats(0, null, null));
  assert.deepEqual(short(kinds.message.render), stats(0, null, null));
  assert.deepEqual(short(kinds.unknown['send-attempt']), stats(1, 30, 30));
  assert.equal(command.endpointStatsByEventKind.unknown.excludedFromEndpointStats, 1);
  assert.equal(command.endpointStatsByEventKind.message.excludedFromEndpointStats, 1);
});

test('native inspect normalization retains complete same-kind phase report', () => {
  const normalized = normalizeBotTimingLogs(rows.map(row => format('[传输耗时]', row)).join('\n'));
  assert.deepEqual(analyzeBotTimings(normalized.jsonl), analyze(rows));
});

test('full previous report stays identical after stripping only the new command field', () => {
  const inputs = [rows, [...rows, ...rows.map(row => ({ ...row, commandKey: 'storyline.list', eventTraceId: 'storyline-' + row.eventTraceId }))], [], rows.filter(x => x.eventTraceId === 'legacy'), [
    { requestId: 'duration-only', stage: 'platform.send', spanSequence: 1, durationMs: 10 },
    { ...span('failed', 'interaction', 'platform.send', 1, 2, 10), outcome: 'rejected' },
    { ...span('bad-offset', 'message', 'platform.send', 1, 0, 20), durationMs: 10 }
  ]];
  for (const values of inputs) {
    const current = analyze(values);
    delete current.operationStatistics;
    for (const command of current.commands) {
      assert.deepEqual(Object.keys(command.observedSendWindowPhaseDistributionsByEventKind), ['message', 'interaction', 'unknown']);
      delete command.observedSendWindowPhaseDistributionsByEventKind;
    }
    assert.deepEqual(current, before(jsonl(values)));
  }
});
