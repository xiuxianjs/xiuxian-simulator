import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { logger, useMessage as useFrameworkMessage, withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { requestBackend } from '../src/api/bot/client';
import { createBackendRequestContext } from '../src/api/bot/context';
import { measureTransportStage, startTransportEvent } from '../src/utils/transportTiming';
import { timedMessageClient, useMessage } from '../src/utils/useMessage';
import { ImageCache } from '../src/utils/imageCdn';
import type { GameEvent } from '../src/types/event';

type Fact = { stage?: string; operationId?: string; requestId?: string; startedFromEventStartMs?: number; elapsedFromEventStartMs?: number; durationMs: number; spanSequence?: number; outcome: string };
const event = (id: string) => ({ name: 'message.create', Platform: 'qq-bot', BotId: 'synthetic-bot', UserId: 'synthetic-user', MessageId: id }) as GameEvent;

test('actual entry/API wrapper and image/send spans share an event origin; inclusive spans and gaps are not summed', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'synthetic-token', log_api_timings: true, log_transport_timings: true });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const facts: Fact[] = [];
  const headers: Headers[] = [];
  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string> }) => {
    headers.push(new Headers(options.headers));
    now = headers.length === 1 ? 140 : 185;
    return { status: 200, headers: {}, data: '{"data":{}}' };
  } }));
  const current = event('command');
  startTransportEvent(current);
  const receipt = [{ code: 4000, message: 'synthetic receipt failure', data: null }];
  let sends = 0;
  await withEventContext(current, () => {}, async () => {
    now = 120;
    await requestBackend(current.UserId, 'post_robot_command_entry', { body: { checkMute: true, playerEntry: true, trackOperation: false, messageText: '/商店' }, idempotencyKey: 'synthetic-event' });
    now = 155;
    await requestBackend(current.UserId, 'getRobotIdentity');
    const cache = new ImageCache({ key: 'transport-integration', md5Key: 'synthetic' });
    now = 190;
    await cache.getOrCreate(async () => {
      const image = await measureTransportStage('image.render', async () => { now = 215; return Buffer.from('synthetic-image'); });
      await measureTransportStage('image.upload', async () => { assert.ok(Buffer.isBuffer(image)); now = 240; return null; });
      return image;
    });
    const client = timedMessageClient({ send: async (params: unknown) => { sends++; assert.equal(params, receipt); now += 20; return receipt; } } as unknown as Parameters<typeof timedMessageClient>[0]);
    now = 250;
    assert.equal(await client.send(receipt as never), receipt);
    assert.equal(await client.send(receipt as never), receipt);
  });
  const requestId = createBackendRequestContext(current).requestId;
  assert.ok(facts.every(fact => fact.requestId === requestId));
  assert.ok(headers.every(value => value.get('X-Request-ID') === requestId));
  assert.equal(sends, 2);
  const byStage = (stage: string) => facts.filter(f => f.stage === stage);
  assert.deepEqual(facts.filter(f => f.operationId).map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs, f.durationMs]), [[20, 40, 20], [55, 85, 30]]);
  assert.deepEqual(byStage('image.render').map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs]), [[90, 115]]);
  assert.deepEqual(byStage('image.upload').map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs]), [[115, 140]]);
  assert.deepEqual(byStage('image.cache.miss').map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs]), [[90, 140]]);
  assert.deepEqual(byStage('platform.send').map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs, f.outcome]), [[150, 170, 'fulfilled'], [170, 190, 'fulfilled']]);
  assert.equal(new Set(facts.filter(f => f.stage).map(f => f.spanSequence)).size, 5);
  // Cache miss includes render+upload; SDK promise fulfilled with code4000 is
  // not successful delivery, and neither successful receipt nor fulfillment
  // proves the user displayed/read it. No upstream queue duration is invented.
  assert.doesNotMatch(JSON.stringify(facts), /synthetic-user|synthetic-event|synthetic receipt failure|synthetic-image|queueWaitMs|userSeen/);
});

test('explicit public useMessage event wins over unrelated ambient event, with unchanged SDK invalid-format receipt', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  const facts: Fact[] = [];
  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  const explicit = event('explicit-error');
  const ambient = event('unrelated');
  startTransportEvent(explicit);
  const [original] = useFrameworkMessage(explicit);
  const expected = await original.send([]);
  await withEventContext(ambient, () => {}, async () => {
    const [wrapped] = useMessage(explicit);
    assert.deepEqual(await wrapped.send([]), expected);
    assert.equal(typeof wrapped.delete, 'function');
    assert.equal(typeof wrapped.edit, 'function');
    assert.equal(typeof wrapped.stream, 'function');
  });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].requestId, createBackendRequestContext(explicit).requestId);
  assert.notEqual(facts[0].requestId, createBackendRequestContext(ambient).requestId);
  assert.equal(facts[0].outcome, 'fulfilled');
});

test('API network rejection and detached send rejection preserve originals, offsets and single attempts', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'synthetic-token', log_api_timings: true, log_transport_timings: true });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const facts: Fact[] = [];
  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; now = 130; throw new Error('synthetic network failure'); } }));
  const current = event('network-error');
  startTransportEvent(current);
  await withEventContext(current, () => {}, async () => {
    now = 110;
    await assert.rejects(requestBackend(current.UserId, 'getRobotIdentity'), /Network request failed/);
  });
  const failure = new Error('original send rejection');
  const wrapped = timedMessageClient({ send: async () => { now = 170; throw failure; } } as unknown as Parameters<typeof timedMessageClient>[0], current);
  now = 150;
  await assert.rejects(wrapped.send([]), value => value === failure);
  assert.equal(calls, 1);
  assert.deepEqual(facts.map(f => [f.startedFromEventStartMs, f.elapsedFromEventStartMs]), [[10, 30], [50, 70]]);
  assert.deepEqual(facts.map(f => f.outcome), ['error', 'rejected']);
});


test('cache creator, joined event and hit retain their own request IDs and inclusive waits', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const facts: Fact[] = [];
  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  const first = event('cache-creator');
  const second = event('cache-joiner');
  startTransportEvent(first);
  now = 110;
  startTransportEvent(second);
  class SyntheticCache extends ImageCache {
    protected async uploadAppImage() { return { imageUrl: 'https://synthetic.test/cache.png', cdnUrl: 'https://synthetic.test/cache.png', path: 'synthetic' }; }
  }
  const cache = new SyntheticCache({ key: 'event-image-join', md5Key: 'same' });
  let release!: () => void;
  now = 115;
  const creator = withEventContext(first, () => {}, () => cache.getOrCreate(async () => {
    const buffer = await measureTransportStage('image.render', async () => { await new Promise<void>(resolve => { release = resolve; }); return Buffer.from('synthetic'); });
    return measureTransportStage('image.upload', async () => { now = 165; return cache.uploadImage({ img: buffer }); });
  }));
  await new Promise<void>(resolve => setImmediate(resolve));
  now = 120;
  const joined = withEventContext(second, () => {}, () => cache.getOrCreate(async () => { throw new Error('join must not render'); }));
  await new Promise<void>(resolve => setImmediate(resolve));
  now = 160;
  release();
  assert.deepEqual(await Promise.all([creator, joined]), ['https://synthetic.test/cache.png', 'https://synthetic.test/cache.png']);
  now = 180;
  await withEventContext(second, () => {}, () => cache.getOrCreate(async () => { throw new Error('hit must not render'); }));
  const rows = (stage: string) => facts.filter(fact => fact.stage === stage);
  assert.equal(rows('image.render').length, 1);
  assert.equal(rows('image.upload').length, 1);
  assert.equal(rows('image.cache.miss')[0].requestId, createBackendRequestContext(first).requestId);
  assert.deepEqual(rows('image.cache.join').map(f => [f.requestId, f.startedFromEventStartMs, f.elapsedFromEventStartMs, f.durationMs]), [[createBackendRequestContext(second).requestId, 10, 55, 45]]);
  assert.deepEqual(rows('image.cache.hit').map(f => [f.requestId, f.startedFromEventStartMs, f.elapsedFromEventStartMs, f.durationMs]), [[createBackendRequestContext(second).requestId, 70, 70, 0]]);
  assert.ok(rows('image.render').concat(rows('image.upload')).every(f => f.requestId === createBackendRequestContext(first).requestId));
});
