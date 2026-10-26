import assert from 'node:assert/strict';
import util from 'node:util';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';
import { normalizeBotTimingLogs } from '../tools/normalize-bot-timing-logs.mjs';
const span = (stage, sequence, start, end, extra = {}) => ({
  requestId: 'r',
  eventTraceId: 'e',
  eventKind: 'message',
  commandKey: 'shop.list',
  stage,
  spanSequence: sequence,
  durationMs: end - start,
  startedFromEventStartMs: start,
  elapsedFromEventStartMs: end,
  outcome: 'fulfilled',
  ...extra
});
const analyze = rows => analyzeBotTimings(rows.map(x => JSON.stringify(x)).join('\n'));
test('installed Router runs the actual two lazy loader closures with processor context and native imports', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  execFileSync(
    process.execPath,
    ['--import', 'tsx', '--test', '--test-force-exit', fileURLToPath(new URL('./fixtures/route-import-native-harness.mjs', import.meta.url))],
    { env, stdio: 'pipe' }
  );
});
test('route-import is retained, classified and merged without adding overlapping phases', () => {
  const rows = [
    span('route.import', 1, 5, 40),
    span('route.import', 2, 10, 30),
    { ...span(undefined, 3, 20, 50), operationId: 'post_robot_command_entry', requestSequence: 1 },
    span('response.build', 4, 50, 60),
    span('platform.send', 5, 60, 70)
  ];
  for (const row of rows) if (row.stage === undefined) delete row.stage;
  const native = normalizeBotTimingLogs(rows.map(row => '[INFO] ' + util.format(row.stage ? '[传输耗时]' : '[后端请求耗时]', row)).join('\n'));
  assert.deepEqual(analyzeBotTimings(native.jsonl), analyze(rows));
  const out = analyze(rows),
    sample = out.samples[0],
    command = out.commands[0];
  assert.equal(sample.timeline[0].phase, 'route-import');
  assert.equal(sample.phases['route-import'].observedSpanCount, 2);
  assert.equal(sample.phases['route-import'].unionMs, 35);
  assert.equal(sample.phases['route-import'].observedSendWindowUnionMs, 35);
  assert.equal(sample.measuredWindowUnionMs, 65);
  assert.deepEqual(sample.unloggedIntervalsMs, [[0, 5]]);
  assert.notEqual(
    Object.values(sample.phases).reduce((n, x) => n + (x.observedSendWindowUnionMs ?? 0), 0),
    sample.measuredWindowUnionMs
  );
  assert.equal(command.phaseDistributions['route-import'].medianMs, 35);
  assert.equal(command.observedSendWindowPhaseDistributions['route-import'].samples, 1);
  assert.equal(sample.largestObservedIndependentPhase, 'route-import');
  assert.equal(sample.observedLastSendEndMs, 70);
});
test('missing/failed import spans remain conservative; normalization strips private loader data', () => {
  const original = [
    span('route.import', 1, 5, 15, { outcome: 'rejected', modulePath: 'PRIVATE-PATH', UserId: 'PRIVATE-UID', token: 'PRIVATE-TOKEN', error: 'PRIVATE-ERROR' })
  ];
  const normalized = normalizeBotTimingLogs(original.map(x => JSON.stringify(x)).join('\n'));
  assert.doesNotMatch(JSON.stringify(normalized), /PRIVATE/);
  const sample = analyzeBotTimings(normalized.jsonl).samples[0];
  assert.equal(sample.stageFailureObserved, true);
  assert.equal(sample.observedLastSendEndMs, null);
  assert.equal(sample.phases['route-import'].unionMs, 10);
  const old = analyze([span('response.build', 1, 10, 20), span('platform.send', 2, 20, 30)]);
  assert.equal(old.samples[0].phases['route-import'].state, 'not-observed-possibly-not-required');
  assert.equal(old.commands[0].phaseDistributions['route-import'].samples, 0);
  assert.equal(old.samples[0].observedLastSendEndMs, 30);
});
