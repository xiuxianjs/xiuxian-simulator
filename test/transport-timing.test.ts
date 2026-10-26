import { timedMessageClient } from '../src/utils/useMessage';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { logger } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { measureTransportStage, startTransportEvent } from '../src/utils/transportTiming';
import type { GameEvent } from '../src/types/event';

test('timings include real completion and event elapsed time without logging payload or identity', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  let now=100;
  t.mock.method(performance, 'now', () => now);
  const logs: unknown[][]=[];
  t.mock.method(logger,'info',(...args: unknown[]) => { logs.push(args); });
  const event={UserId:'private-player',MessageId:'private-message',Platform:'qq-bot'} as GameEvent;
  startTransportEvent(event);
  now=120;
  let finish!: (value: object) => void;
  const pending=measureTransportStage('platform.send',()=>new Promise<object>(resolve=>{finish=resolve;}),event);
  assert.equal(logs.length,0);
  const receipt={code: 4000,message:'platform failure'};
  now=170;
  finish(receipt);
  assert.equal(await pending,receipt);
  assert.equal(logs.length,1);
  assert.match(JSON.stringify(logs),/"durationMs":50/);
  assert.match(JSON.stringify(logs),/"elapsedFromEventStartMs":70/);
  assert.doesNotMatch(JSON.stringify(logs),/private-player|private-message|platform failure/);
});

test('timings preserve rejected operations without triggering a retry', async t => {
  mockBackendConfig(t, { log_transport_timings: false });
  let calls=0;
  const failure=new Error('original error');
  await assert.rejects(measureTransportStage('image.render',async()=>{calls++;throw failure;}),error=>error===failure);
  assert.equal(calls,1);
});

test('diagnostic failures preserve the original result and error', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  t.mock.method(logger, 'info', () => { throw new Error('logging failed'); });
  const result = { accepted: true };
  assert.equal(await measureTransportStage('platform.send', async () => result), result);
  const failure = new Error('send failed');
  await assert.rejects(measureTransportStage('platform.send', async () => { throw failure; }), error => error === failure);
});

test('the shared message wrapper passes the exact arguments and results, including SDK failure receipts', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  t.mock.method(logger,'info',()=>undefined);
  const params: []=[];
  const receipts=[{code:4000,message:'platform rejected',data:null}];
  let calls=0;
  const original={send:async(value: unknown)=>{calls++;assert.equal(value,params);return receipts;},delete:async()=>receipts[0]};
  const wrapped=timedMessageClient(original as unknown as Parameters<typeof timedMessageClient>[0]);
  assert.equal(wrapped.delete,original.delete);
  assert.equal(await wrapped.send(params),receipts);
  assert.equal(calls,1);
});

test('dynamic stage classification remains local to overlapping event measurements', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  const logs: { stage: string; requestId: string }[] = [];
  t.mock.method(logger, 'info', (_label: string, value: { stage: string; requestId: string }) => { logs.push(value); });
  const first = { UserId: 'first-private', MessageId: 'first-message', Platform: 'qq-bot' } as GameEvent;
  const second = { UserId: 'second-private', MessageId: 'second-message', Platform: 'qq-bot' } as GameEvent;
  let status = 'miss';
  let finish!: () => void;
  const creator = measureTransportStage(() => `image.cache.${status}`, () => new Promise<void>(resolve => { finish = resolve; }), first);
  await measureTransportStage(() => 'image.cache.hit', async () => 'cached', second);
  status = 'join';
  finish();
  await creator;
  assert.deepEqual(logs.map(log => log.stage), ['image.cache.hit', 'image.cache.join']);
  assert.ok(logs[0].requestId);
  assert.ok(logs[1].requestId);
  assert.notEqual(logs[0].requestId, logs[1].requestId);
  assert.doesNotMatch(JSON.stringify(logs), /first-private|second-private|first-message|second-message/);
});


test('home timing always logs sub-millisecond spans while retaining fractional offsets', async t => {
  mockBackendConfig(t, { log_transport_timings: false });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const facts: Array<{ stage: string; durationMs: number; elapsedFromEventStartMs: number }> = [];
  t.mock.method(logger, 'info', (_label: string, fact: typeof facts[number]) => { facts.push(fact); });
  const e = { name: 'message.create', MessageText: '/我的资料', UserId: 'local', MessageId: 'one' } as GameEvent;
  startTransportEvent(e);
  await measureTransportStage('home.test', async () => { now += 0.125; return 1; }, e);
  assert.equal(facts[0].stage, 'event.received');
  assert.equal(facts[1].durationMs, 0.125);
  assert.equal(facts[1].elapsedFromEventStartMs, 0.125);
});
