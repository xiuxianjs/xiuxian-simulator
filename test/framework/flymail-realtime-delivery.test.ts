import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { createResult, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { startNotificationStream, stopNotificationStream } from '../../src/notification/stream';

after(() => shutdownLogger());

test('SSE 飞信按固定窗口推送，普通消息认领阻塞时也不等待，成功回执后才 ack', async t => {
  const originalLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => {
    stopNotificationStream();
    if (originalLogin === undefined) delete process.env.login;
    else process.env.login = originalLogin;
  });
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'offline-token' } } } });
  t.after(() => app.dispose());
  let entered!: () => void, release!: () => void, delivered!: () => void, acknowledged!: () => void;
  const standardEntered = new Promise<void>(resolve => { entered = resolve; });
  const standardRelease = new Promise<void>(resolve => { release = resolve; });
  const sent = new Promise<void>(resolve => { delivered = resolve; });
  const ack = new Promise<void>(resolve => { acknowledged = resolve; });
  let released = false, pending = false, hasReceipt = false;
  const receipts: unknown[] = [];
  const encoder = new TextEncoder();
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      stream = controller;
      controller.enqueue(encoder.encode('event: stream.ready\ndata: {}\n\n'));
      options.signal?.addEventListener('abort', () => controller.close(), { once: true });
    }
  }), { headers: { 'Content-Type': 'text/event-stream' } }));
  t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
    let data: unknown = null;
    if (path.endsWith('/claim')) {
      if (body.eventType === 'platform.message.dispatch') { entered(); await standardRelease; }
      if (body.lane === 'flymail' && pending) {
        pending = false;
        data = { event: { eventId: 'flymail.message:9:received:7', recipientUserId: 7, recipientBid: 'recipient', payload: {
          version: 1, recipientUserId: 7, source: 'flymail.message.received', data: [{ type: 'Text', value: '实时飞信内容' }]
        } } };
      } else data = { event: null };
    } else if (path.endsWith('/ack')) {
      assert.equal(hasReceipt, true, '平台成功回执前不能 ack');
      receipts.push(body.delivery);
      acknowledged();
    } else if (path.endsWith('/retry')) throw new Error(String(body.error));
    else if (path.endsWith('/legacy-sent-ids')) throw new Error('飞信不得等待旧消息池快照');
    else if (path.endsWith('/community/claim')) data = null;
    else if (path.endsWith('/player/categories')) data = { enabled: true };
    else if (path.endsWith('/subscription')) data = { platform: 'qq-bot', channelId: 'flymail-group', botId: 'bot', targetScope: 'group', isEnabled: true, failureCount: 0, lastDeliveryAt: null, lastError: null };
    else if (path.endsWith('/private-target/read')) data = { platform: 'qq-bot', scope: 'c2c', targetId: 'private-recipient', BotId: 'bot' };
    else if (path.endsWith('/availability/read')) data = { available: true, updatedAt: 1 };
    else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
    else if (path.endsWith('/receipt/read')) data = null;
    else if (!['/receipt/store', '/subscription/receipt', '/permission/cas'].some(suffix => path.endsWith(suffix))) throw new Error(`Unexpected request: ${path}`);
    return { data: { data } };
  } }));
  app.actions.on('message.send.target', () => {
    assert.equal(released, false, '普通消息处理完成前就应尝试飞信推送');
    hasReceipt = true;
    delivered();
    return [createResult(ResultCode.Ok, '送达', { id: 'flymail-receipt' })];
  });
  t.after(() => { release(); });
  const handler = onResponse('message.create', async () => {
    startNotificationStream();
    await standardEntered;
    pending = true;
    stream.enqueue(encoder.encode('event: notification.ready\ndata: {}\n\n'));
    await sent;
    await ack;
    stopNotificationStream();
    released = true;
    release();
  });
  const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.match(inspectMessage(result.messages[0].nodes).text, /实时飞信内容/);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(receipts, [{ route: 'private', reason: 'sent' }]);
});
