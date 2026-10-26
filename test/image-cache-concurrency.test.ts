import { logger } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ImageCache } from '../src/utils/imageCdn';

class TestCache extends ImageCache {
  uploads = 0;
  protected async uploadAppImage() {
    this.uploads++;
    return { imageUrl: 'https://image.test/cached.png', cdnUrl: 'https://image.test/cached.png', path: 'test.png' };
  }
}

test('concurrent requests share both rendering and upload, and later requests reuse the URL', async () => {
  const key = 'concurrent-image-test';
  const first = new TestCache({ key, md5Key: 'same-state' });
  const second = new TestCache({ key, md5Key: 'same-state' });
  let renders = 0;
  let finish!: () => void;
  const render = async () => { renders++; await new Promise<void>(resolve => { finish = resolve; }); return first.uploadImage({ img: Buffer.from('image') }); };
  const pending = [first.getOrCreate(render), second.getOrCreate(render)];
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(renders, 1);
  finish();
  assert.deepEqual(await Promise.all(pending), ['https://image.test/cached.png', 'https://image.test/cached.png']);
  assert.equal(first.uploads, 1);
  assert.equal(second.uploads, 0);
  assert.equal(await second.getOrCreate(async () => { throw new Error('must use URL cache'); }), 'https://image.test/cached.png');
});

test('changed player state never shares another fingerprint job', async () => {
  const key = 'changed-state-image-test';
  const first = new TestCache({ key, md5Key: 'old-state' });
  const second = new TestCache({ key, md5Key: 'new-state' });
  const values = await Promise.all([first.getOrCreate(async () => 'old-image'), second.getOrCreate(async () => 'new-image')]);
  assert.deepEqual(values, ['old-image', 'new-image']);
});

test('failed jobs are released, while no rendering or upload is automatically retried', async () => {
  const cache = new TestCache({ key: 'failed-image-test', md5Key: 'state' });
  let calls = 0;
  const fail = async () => { calls++; throw new Error('render failure'); };
  const results = await Promise.allSettled([cache.getOrCreate(fail), cache.getOrCreate(fail)]);
  assert.ok(results.every(result => result.status === 'rejected'));
  assert.equal(calls, 1);
  assert.equal(await cache.getOrCreate(async () => { calls++; return null; }), null);
  assert.equal(calls, 2);
  assert.equal(await cache.getOrCreate(async () => 'next-request-result'), 'next-request-result');
});

test('cache timings distinguish creator, per-caller wait, and hit without leaking keys', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const logs: unknown[][] = [];
  t.mock.method(logger, 'info', (...args: unknown[]) => { logs.push(args); });
  const cache = new TestCache({ key: 'private-cache-key', md5Key: 'private-fingerprint' });
  let finish!: () => void;
  const creator = cache.getOrCreate(async () => {
    await new Promise<void>(resolve => { finish = resolve; });
    return cache.uploadImage({ img: Buffer.from('private-image') });
  });
  await new Promise<void>(resolve => setImmediate(resolve));
  now = 120;
  const join = cache.getOrCreate(async () => { throw new Error('must join'); });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(logs.length, 0);
  now = 170;
  finish();
  assert.deepEqual(await Promise.all([creator, join]), ['https://image.test/cached.png', 'https://image.test/cached.png']);
  const facts = logs.map(args => args[1]) as { stage: string; durationMs: number; outcome: string }[];
  assert.deepEqual(facts.map(fact => [fact.stage, fact.durationMs]).sort(), [['image.cache.join', 50], ['image.cache.miss', 70]]);
  assert.equal(await cache.getURL(), 'https://image.test/cached.png');
  assert.equal(await cache.getOrCreate(async () => { throw new Error('must hit'); }), 'https://image.test/cached.png');
  assert.equal(logs.length, 4);
  assert.ok(logs.slice(2).every(args => (args[1] as { stage: string }).stage === 'image.cache.hit'));
  assert.doesNotMatch(JSON.stringify(logs), /private-cache-key|private-fingerprint|private-image|https:/);
});

test('cache creator and waiter keep the same original rejection and remain retryable with diagnostics', async t => {
  mockBackendConfig(t, { log_transport_timings: true });
  const facts: { stage: string; outcome: string }[] = [];
  t.mock.method(logger, 'info', (_label: string, value: { stage: string; outcome: string }) => { facts.push(value); });
  const cache = new TestCache({ key: 'timed-rejected-image', md5Key: 'state' });
  const failure = new Error('original render failure');
  const results = await Promise.allSettled([cache.getOrCreate(async () => { throw failure; }), cache.getOrCreate(async () => 'must not execute')]);
  assert.ok(results.every(result => result.status === 'rejected' && result.reason === failure));
  assert.deepEqual(facts.map(fact => [fact.stage, fact.outcome]).sort(), [['image.cache.join', 'rejected'], ['image.cache.miss', 'rejected']]);
  assert.equal(await cache.getOrCreate(async () => null), null);
});
