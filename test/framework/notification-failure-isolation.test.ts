import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios, { AxiosError } from 'axios';
import { logger, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { startNotificationStream, stopNotificationStream } from '../../src/notification/stream';
import { claimNotificationRelay } from '../../src/api/bot/notification-relay';
import { observeChatContacts } from '../../src/api/bot/chat';
import { readPlatformDeliveryReceipt } from '../../src/api/bot/notification-cache';

const config = {
  'qq-bot': { app_id: '100017' },
  'xiuxian-game': { backend: { channel_mode: true, api_url: 'https://channel.invalid', robot_auth_token: 'secret-bot-token', worker_token: 'secret-worker-token' } }
};
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
after(() => shutdownLogger());
function unavailable() {
  return new AxiosError('raw transport with secret-bot-token', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 503, statusText: 'Service Unavailable', data: { error: { code: 'SERVICE_UNAVAILABLE', message: '渠道凭据暂时无法验证 secret-bot-token secret-worker-token', requestId: 'req_notification_test' }, private: 'never-log-response-body' }, headers: {}, config: { headers: { Authorization: 'Bearer secret-bot-token' } }
  } as never);
}

test('503 日志包含接口、状态、业务错误和请求编号，不携带 Token 或响应原文', async t => {
  const app = createTestApp({ config, timeoutMs: 60000 });
  t.after(() => app.dispose());
  t.mock.method(axios, 'create', () => ({ post: async () => { throw unavailable(); } } as never));
  const result = await app.runHandler(async () => {
    for (const request of [() => claimNotificationRelay('player.notification.dispatch', 'consumer', 'flymail'), () => readPlatformDeliveryReceipt('event')]) {
      await assert.rejects(request(), error => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /status=503/);
        assert.match(error.message, /code=SERVICE_UNAVAILABLE/);
        assert.match(error.message, /req_notification_test/);
        assert.match(error.message, /path=\/api\/v1\/internal\/notification-relay/);
        assert.doesNotMatch(JSON.stringify(error) + error.stack, /secret-bot-token|secret-worker-token|never-log-response-body|Authorization/);
        return true;
      });
    }
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
  assert.deepEqual(result.errors, []);
});

for (const channelMode of [false, true]) {
test(`领取失败只重试对应队列，健康 SSE 与其它队列不受影响 channel=${channelMode}`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const app = createTestApp({ config: { ...config, 'xiuxian-game': { backend: { ...config['xiuxian-game'].backend, channel_mode: channelMode } } }, timeoutMs: 60000 });
  t.after(() => app.dispose());
  t.after(() => stopNotificationStream());
  t.mock.method(logger, 'error', () => {});
  let streams = 0;
  let signal!: AbortSignal;
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const counts = { flymail: 0, standard: 0, community: 0 };
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    streams++;
    signal = options.signal!;
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      stream = controller;
      controller.enqueue(new TextEncoder().encode('event: stream.ready\ndata: {}\n\n'));
      signal.addEventListener('abort', () => controller.close(), { once: true });
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  t.mock.method(axios, 'create', options => {
    assert.deepEqual(options?.headers, channelMode ? { Authorization: 'Bearer secret-bot-token' } : { 'X-Worker-Token': 'secret-worker-token' });
    return { post: async (path: string, body: Record<string, unknown>) => {
    if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
    if (path.endsWith('/community/claim')) { counts.community++; throw unavailable(); }
    if (path.endsWith('/claim')) {
      if (body.eventType !== 'player.notification.dispatch') {
        assert.equal(channelMode, false);
        assert.equal(body.eventType, 'platform.message.dispatch');
        return { data: { data: { event: null } } };
      }
      if (body.lane === 'flymail') {
        counts.flymail++;
        if (counts.flymail === 1) throw unavailable();
      } else counts.standard++;
      return { data: { data: { event: null } } };
    }
    throw new Error(`Unexpected path ${path}`);
    } } as never;
  });
  const result = await app.runHandler(async () => {
    startNotificationStream();
    await settle();
    assert.deepEqual(counts, { flymail: 1, standard: 1, community: 1 });
    assert.equal(signal.aborted, false);
    stream.enqueue(new TextEncoder().encode('event: notification.ready\ndata: {}\n\n'));
    await settle();
    assert.deepEqual(counts, { flymail: 1, standard: 2, community: 1 });
    t.mock.timers.tick(1000);
    await settle();
    assert.deepEqual(counts, { flymail: 2, standard: 2, community: 2 });
    t.mock.timers.tick(2000);
    await settle();
    assert.deepEqual(counts, { flymail: 2, standard: 2, community: 3 });
    assert.equal(streams, 1);
    assert.equal(signal.aborted, false);
    stopNotificationStream();
    const stopped = { ...counts };
    t.mock.timers.tick(30000);
    await settle();
    assert.deepEqual(counts, stopped);
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
  assert.deepEqual(result.errors, []);
});

}


for (const channelMode of [false, true]) {
  test(`纯文本聊天 401 区分渠道鉴权部署不匹配与官服凭据失败 channel=${channelMode}`, async t => {
    const app = createTestApp({ config: { ...config, 'xiuxian-game': { backend: { ...config['xiuxian-game'].backend, channel_mode: channelMode } } } });
    t.after(() => app.dispose());
    t.mock.method(axios, 'create', options => {
      assert.deepEqual(options?.headers, channelMode ? { Authorization: 'Bearer secret-bot-token' } : { 'X-Worker-Token': 'secret-worker-token' });
      return { post: async () => { throw new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401, data: '未授权\n', headers: {}, config: { headers: {} }
      } as never); } } as never;
    });
    const result = await app.runHandler(async () => {
      await assert.rejects(observeChatContacts([]), error => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /status=401/);
        if (channelMode) {
          assert.match(error.message, /CHANNEL_CHAT_AUTH_MISMATCH/);
          assert.match(error.message, /GAME_MODE=channel/);
          assert.match(error.message, /代理目标/);
        } else {
          assert.match(error.message, /code=ERR_BAD_REQUEST/);
          assert.doesNotMatch(error.message, /CHANNEL_CHAT_AUTH_MISMATCH/);
        }
        assert.doesNotMatch(error.stack!, /secret-bot-token|secret-worker-token/);
        return true;
      });
    }, app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
    assert.deepEqual(result.errors, []);
  });
}

test('标准通知领取失败只由队列重试层记录一次', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  t.after(() => stopNotificationStream());
  const logs: unknown[][] = [];
  t.mock.method(logger, 'error', (...args) => { logs.push(args); });
  t.mock.method(axios, 'create', () => ({ post: async (path: string, body: Record<string, unknown>) => {
    if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
    if (path.endsWith('/community/claim')) return { data: { data: null } };
    if (body.lane === 'standard') throw unavailable();
    return { data: { data: { event: null } } };
  } } as never));
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => new Response(new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode('event: stream.ready\ndata: {}\n\n'));
    options.signal?.addEventListener('abort', () => controller.close(), { once: true });
  } }), { headers: { 'Content-Type': 'text/event-stream' } }));
  const result = await app.runHandler(async () => {
    startNotificationStream();
    await settle();
    assert.equal(logs.length, 1);
    assert.match(String(logs[0][0]), /玩家通知/);
    assert.match((logs[0][1] as Error).message, /req_notification_test/);
    stopNotificationStream();
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '100017' }));
  assert.deepEqual(result.errors, []);
});
