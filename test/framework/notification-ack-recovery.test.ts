import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import axios, { AxiosError } from 'axios';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { acknowledgeNotificationRelay, retryNotificationRelay } from '../../src/api/bot/notification-relay';
import { deliverNotificationOnce } from '../../src/notification/service';

after(() => shutdownLogger());

test('只有可恢复的发送前回执读取故障才归还投递次数', async t => {
  const cwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'notification-preflight-'));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  });
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } }
  });
  t.after(() => app.dispose());
  const retries: Record<string, unknown>[] = [];
  let readStatus = 503;
  let sends = 0;
  const platformUnavailable = new AxiosError('platform send failed', 'ERR_BAD_RESPONSE');
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: Record<string, unknown>) {
      if (path.endsWith('/receipt/read')) {
        if (readStatus === 200) return { data: { data: null } };
        throw new AxiosError('receipt lookup failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
          status: readStatus, data: {}, headers: {}, config: {}
        } as never);
      }
      assert.ok(path.endsWith('/notification-relay/retry'));
      retries.push(body);
      return { data: { data: { ok: true } } };
    }
  } as never));
  const result = await app.runHandler(async () => {
    for (const status of [503, 400, 200]) {
      readStatus = status;
      const error = await deliverNotificationOnce('event', async () => {
        sends++;
        throw platformUnavailable;
      }).then(() => assert.fail('expected notification to fail'), (error: unknown) => error);
      await retryNotificationRelay('event', 'fixture-consumer', error);
    }
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '123' }));
  assert.deepEqual(result.errors, []);
  assert.equal(sends, 1);
  assert.deepEqual(retries.map(body => body.receiptLookupUnavailable), [true, undefined, undefined]);
});

test('回执写入和事件确认同时失败后，用本机回执恢复且不串服', async t => {
  const cwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'notification-receipts-'));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  });
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://first.test', worker_token: 'fixture' } } }
  });
  const other = createTestApp({
    config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://other.test', worker_token: 'fixture' } } }
  });
  t.after(async () => {
    await app.dispose();
    await other.dispose();
  });
  let unavailable = false;
  let reads = 0;
  let sends = 0;
  const sent = { route: 'group', reason: 'sent' } as const;

  t.mock.method(axios, 'create', () => ({
    async post(path: string) {
      if (path.endsWith('/receipt/read')) reads++;
      if (unavailable || path.endsWith('/receipt/store')) {
        throw new AxiosError('unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
          status: 503, data: {}, headers: {}, config: {}
        } as never);
      }
      return { data: { data: path.endsWith('/receipt/read') ? null : { ok: true } } };
    }
  } as never));

  const consume = () => deliverNotificationOnce('fixture-event', async () => {
    sends++;
    return sent;
  });
  const run = (target: typeof app, work: () => Promise<void>) => target.runHandler(work, target.events.groupMessage({ platform: 'qq-bot', botId: '123' }));
  const first = await run(app, async () => {
    const delivery = await consume();
    assert.deepEqual(delivery, sent);
    unavailable = true;
    await assert.rejects(acknowledgeNotificationRelay('fixture-event', 'consumer', delivery), /status=503/);
    assert.deepEqual(await consume(), sent);
  });
  assert.deepEqual(first.errors, []);
  assert.equal(reads, 1);
  assert.equal(sends, 1);
  unavailable = false;
  const second = await run(other, async () => {
    assert.deepEqual(await consume(), sent);
  });
  assert.deepEqual(second.errors, []);
  assert.equal(reads, 2);
  assert.equal(sends, 2);
});

for (const cause of ['ECONNRESET', '503', '403']) {
  test(`通知确认失败后只重试可恢复的同一回执 ${cause}`, async t => {
    const app = createTestApp({
      config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } }
    });
    t.after(() => app.dispose());
    const requests: unknown[] = [];
    t.mock.method(axios, 'create', () => ({
      async post(path: string, body: unknown) {
        assert.match(path, /\/notification-relay\/ack$/);
        requests.push(body);
        if (requests.length === 1) {
          if (cause === 'ECONNRESET') {
            throw new AxiosError('reply lost', cause);
          }
          throw new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status: Number(cause), data: {}, headers: {}, config: { headers: {} }
          } as never);
        }
        return { data: { data: { ok: true } } };
      }
    } as never));

    const result = await app.runHandler(async () => {
      const delivery = { route: 'private', reason: 'sent' } as const;
      const ack = acknowledgeNotificationRelay('flymail.message:1', 'consumer', delivery);
      if (cause === '403') {
        await assert.rejects(ack, /status=403/);
      } else {
        await ack;
      }
      const expected = { eventId: 'flymail.message:1', consumer: 'consumer', delivery };
      assert.deepEqual(requests, cause === '403' ? [expected] : [expected, expected]);
    }, app.events.groupMessage({ platform: 'qq-bot', botId: '123' }));
    assert.deepEqual(result.errors, []);
  });
}
