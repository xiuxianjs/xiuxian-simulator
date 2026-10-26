import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';
import { analyzeBotTimings as before } from './fixtures/bot-timing-native/analyzer-before-operation-statistics.mjs';

const api = (event, operationId, requestSequence, start, end, extra = {}) => ({ requestId: 'shared-request', eventTraceId: event, commandKey: 'shop.list', eventKind: 'message', operationId, requestSequence, durationMs: end - start, startedFromEventStartMs: start, elapsedFromEventStartMs: end, outcome: 'success', ...extra });
const send = (event, start, end, extra = {}) => ({ requestId: 'shared-request', eventTraceId: event, commandKey: 'shop.list', eventKind: 'message', stage: 'platform.send', spanSequence: 1, durationMs: end - start, startedFromEventStartMs: start, elapsedFromEventStartMs: end, outcome: 'fulfilled', ...extra });
const jsonl = rows => rows.map(row => JSON.stringify(row)).join('\n');
const analyze = rows => analyzeBotTimings(jsonl(rows));
const normal = [api('normal', 'post_robot_command_entry', 1, 0, 10), api('normal', 'get_players_id_shop_products', 2, 10, 30), send('normal', 30, 40)];
const legacyOperations = ['getRobotIdentity', 'get_players_id_guides_newcomer', 'post_players_id_captcha_state_verify', 'post_players_id_captcha_state_mute_reply_claim', 'post_players_id_entry', 'get_players_id_shop_products'];
const legacy = [...legacyOperations.map((op, index) => api('legacy', op, index + 1, index * 10, (index + 1) * 10)), send('legacy', 60, 70)];

test('normal two HTTP and legacy six HTTP retain distinct exact identities without guessing phases', () => {
  const result = analyze([...normal, ...legacy]);
  const exact = result.operationStatistics;
  assert.equal(Object.keys(exact.events[0].operations).length, 2);
  assert.equal(Object.keys(exact.events[1].operations).length, 6);
  assert.equal(exact.commands[0].operations.get_players_id_shop_products.correlatedEvents, 2);
  assert.equal(exact.events[1].operations.post_players_id_entry.unionMs, 10);
  assert.equal(result.samples[1].phases.business.unionMs, 60); // old field intentionally unchanged
  assert.equal(exact.commands[0].operations.post_robot_command_entry.observedSpanCount, 1);
  assert.deepEqual(Object.keys(exact.commands[0].byEventKind), ['message', 'interaction', 'unknown']);
});

test('overlapping API spans use interval unions and clip at observed send without adding durations', () => {
  const result = analyze([api('overlap', 'get_players_id_shop_products', 1, 0, 30), api('overlap', 'get_players_id_shop_products', 2, 10, 50), api('overlap', 'get_players_id_shop_products', 3, 70, 80), send('overlap', 20, 40)]).operationStatistics;
  const op = result.events[0].operations.get_players_id_shop_products;
  assert.equal(op.unionMs, 60);
  assert.equal(op.observedSendWindowUnionMs, 40);
  assert.deepEqual(op.callDurationDistribution, { samples: 3, medianMs: 30, p95Ms: 40 });
  assert.equal(result.commands[0].operations.get_players_id_shop_products.observedUnionDistribution.medianMs, 60);
});

test('actual events and event kinds remain separate even with shared request ID and failing API', () => {
  const rows = [...normal, api('interaction', 'get_players_id_shop_products', 1, 0, 100, { eventKind: 'interaction', outcome: 'error' }), send('interaction', 100, 110, { eventKind: 'interaction' })];
  const out = analyze(rows).operationStatistics;
  assert.equal(out.events.length, 2);
  assert.equal(out.events[1].operations.get_players_id_shop_products.outcomes.error, 1);
  assert.equal(out.commands[0].byEventKind.message.get_players_id_shop_products.observedUnionDistribution.medianMs, 20);
  assert.equal(out.commands[0].byEventKind.interaction.get_players_id_shop_products.observedUnionDistribution.medianMs, 100);
});

test('missing or inconsistent origins and ambiguous events preserve standalone durations without manufacturing window', () => {
  const rows = [api('missing', 'get_players_id_shop_products', 1, 0, 30, { startedFromEventStartMs: undefined, elapsedFromEventStartMs: undefined, outcome: 'error' }), send('missing', 30, 40), api('bad', 'get_players_id_shop_products', 1, 0, 30, { durationMs: 10 }), send('bad', 30, 40), api('ambiguous', 'get_players_id_shop_products', 1, 0, 30), api('ambiguous', 'get_players_id_shop_products', 1, 0, 20), send('ambiguous', 30, 40)];
  const out = analyze(rows).operationStatistics;
  for (const event of out.events.slice(0, 2)) {
    assert.equal(event.operations.get_players_id_shop_products.unionMs, null);
    assert.equal(event.operations.get_players_id_shop_products.observedSendWindowUnionMs, null);
  }
  const op = out.commands[0].operations.get_players_id_shop_products;
  assert.equal(op.excludedFromEndpointStats, 3);
  assert.equal(op.observedUnionDistribution.samples, 0);
  assert.equal(op.callDurationDistribution.samples, 4);
});

test('entire prior analyzer report is identical after removing only additive operationStatistics', () => {
  for (const rows of [normal, legacy, [...normal, ...legacy], [], [api('missing', 'get_players_id_shop_products', 1, 0, 10, { startedFromEventStartMs: undefined })], [api('unmapped', 'get_other_operation', 1, 0, 10), send('unmapped', 10, 20)], [api('unsafe', 'get_bad/token', 1, 0, 10), send('unsafe', 10, 20)]]) {
    const result = analyze(rows);
    delete result.operationStatistics;
    assert.deepEqual(result, before(jsonl(rows)));
  }
  const unsafe = analyze([api('unsafe', 'get_bad/token', 1, 0, 10), send('unsafe', 10, 20)]);
  assert.equal(JSON.stringify(unsafe.operationStatistics).includes('get_bad/token'), false);
});
