import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';
const span = overrides => ({ requestId: 'authority-a', eventTraceId: 'event-1', commandKey: 'shop.list', stage: 'platform.send', durationMs: 10,
  spanSequence: 1, startedFromEventStartMs: 10, elapsedFromEventStartMs: 20, outcome: 'fulfilled', ...overrides });
const analyze = rows => analyzeBotTimings(rows.map(row => JSON.stringify(row)).join('\n'));
test('diagnostic event grouping retains distinct authoritative request IDs without merging events', () => {
  const out = analyze([span({requestId:'api-override',operationId:'get_players_id_shop_products',stage:undefined,requestSequence:1}),span({})]);
  assert.equal(out.samples.length,1);assert.deepEqual(out.samples[0].requestIds,['api-override','authority-a']);
  assert.equal(out.commands[0].correlatedEvents,1);assert.equal(out.commands[0].correlatedRequestIds,2);
  const separate=analyze([span({}),span({eventTraceId:'event-2'})]);assert.equal(separate.samples.length,2);
  assert.equal(separate.commands[0].correlatedEvents,2);assert.equal(separate.commands[0].correlatedRequestIds,1);
});
test('file preparation contributes union coverage and never manufactures send completion', () => {
  const out=analyze([span({stage:'image.file_load'})]);assert.equal(out.samples[0].phases['file-preparation'].unionMs,10);
  assert.equal(out.samples[0].observedLastSendEndMs,null);assert.equal(out.samples[0].phases['send-attempt'].observedSpanCount,0);
});
test('unsafe trace fields and unknown producer command strings are never echoed', () => {
  const out=analyze([span({eventTraceId:'PRIVATE RAW TRACE'}),span({eventTraceId:'event-2',commandKey:'PRIVATE_COMMAND'})]);
  assert.equal(out.diagnostics.unsafeEventTraceIds,1);assert.equal(out.uncorrelated.length,1);assert.equal(out.samples[0].commandKey,'unknown');
  assert.doesNotMatch(JSON.stringify(out),/PRIVATE/);
});
test('conflicting static labels remain ambiguous, not guessed to be a complete command', () => {
  const out=analyze([span({}),span({spanSequence:2,commandKey:'storyline.list'})]);
  assert.equal(out.samples[0].ambiguousIdentity,true);assert.equal(out.samples[0].observedLastSendEndMs,null);
});
