import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { createResult, getConfig, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { PushMessageTask } from '../../src/task/pushMessageTask';
import { startNotificationStream, stopNotificationStream } from '../../src/notification/stream';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { requestBackend } from '../../src/api/bot/client';

after(() => shutdownLogger());

const config = {
  'xiuxian-game': { backend: { api_url: 'https://channel.invalid', channel_mode: true, robot_auth_token: 'merchant-token', worker_token: 'never-send' } },
  'qq-bot': { default_bot: '100017', bots: { '100017': {}, '100018': {} } }
};

test('game API rejects another robot event before creating an authenticated request', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  t.mock.method(axios, 'create', () => { throw new Error('must not create client'); });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('must not send'); });
  const result = await app.runHandler(async () => {
    await assert.rejects(requestBackend('same-native', 'get_auth_profile'), /不匹配/);
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '100018' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 0);
});

test('channel player notification uses native destination, real platform receipt, then ack without global claim', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  const oldLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => { if (oldLogin === undefined) delete process.env.login; else process.env.login = oldLogin; });
  let pending = true;
  let delivered = false;
  const acknowledgements: unknown[] = [];
  t.mock.method(axios, 'create', options => {
    assert.deepEqual(options?.headers, { Authorization: 'Bearer merchant-token' });
    return { post: async (path: string, body: Record<string, unknown>) => {
      let data: unknown = null;
      if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
      if (path.endsWith('/retry')) throw new Error(String(body.error));
      if (path.endsWith('/claim')) {
        assert.equal(body.eventType, 'player.notification.dispatch');
        const event = body.lane === 'standard' && pending ? {
          eventId: 'own-event', recipientUserId: 7, recipientBid: 'native-recipient', payload: {
            version: 1, recipientUserId: 7, source: 'pk.ordinary', data: [{ type: 'Text', value: '普通被打战报 #42' }]
          }
        } : null;
        if (event) pending = false;
        data = { event };
      } else if (path.endsWith('/legacy-sent-ids')) {
        assert.equal(body.botId, '100017');
        data = { ids: [] };
      } else if (path.endsWith('/player/categories')) data = { enabled: true };
      else if (path.endsWith('/activity/candidates')) data = [];
      else if (path.endsWith('/private-target/read')) {
        assert.equal(body.bid, 'native-recipient');
        data = { platform: 'qq-bot', scope: 'c2c', BotId: '100017', targetId: 'native-private' };
      } else if (path.endsWith('/availability/read')) data = { available: true, updatedAt: 1 };
      else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      else if (path.endsWith('/ack')) {
        assert.equal(delivered, true, 'ack must follow successful platform action');
        acknowledgements.push(body.delivery);
      } else if (!['/receipt/read', '/receipt/store', '/subscription', '/subscription/receipt', '/permission/cas'].some(suffix => path.endsWith(suffix))) {
        throw new Error(`Unexpected request ${path}`);
      }
      return { data: { data } };
    } } as never;
  });
  app.actions.on('message.send.target', () => {
    delivered = true;
    return [createResult(ResultCode.Ok, '送达', { id: 'channel-platform-receipt' })];
  });
  const result = await app.runHandler(async () => { await PushMessageTask(); }, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].target?.BotId, '100017');
  assert.equal(result.messages[0].target?.targetId, 'native-private');
  assert.ok(inspectMessage(result.messages[0].nodes).commands.includes('/争夺战报 42'));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(acknowledgements, [{ route: 'private', reason: 'sent' }]);
});

test('channel SSE wakes player, selected-bot community and scoped chat queues using BOT_TOKEN', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  t.after(() => stopNotificationStream());
  let ready!: () => void;
  const claimed = new Promise<void>(resolve => { ready = resolve; });
  const seen = new Set<string>();
  t.mock.method(axios, 'create', options => {
    assert.deepEqual(options?.headers, { Authorization: 'Bearer merchant-token' });
    return { post: async (path: string, body: Record<string, unknown>) => {
      if (path.endsWith('/claim-next')) {
        assert.equal(body.botId, '100017');
        return { data: { claim: null, pending: false } };
      }
      if (path.endsWith('/community/claim')) {
        assert.equal(body.botId, '100017');
        seen.add('community');
      } else if (path.endsWith('/claim')) {
        assert.equal(body.eventType, 'player.notification.dispatch');
        seen.add(String(body.lane));
      } else throw new Error(`Unexpected request ${path}`);
      if (seen.size === 3) ready();
      return { data: { data: path.endsWith('/community/claim') ? null : { event: null } } };
    } } as never;
  });
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    assert.deepEqual(options.headers, { Authorization: 'Bearer merchant-token', Accept: 'text/event-stream' });
    assert.equal(options.redirect, 'error');
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('event: stream.ready\ndata: {}\n\n'));
      options.signal?.addEventListener('abort', () => controller.close(), { once: true });
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const result = await app.runHandler(async () => {
    startNotificationStream();
    await claimed;
    stopNotificationStream();
  }, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.deepEqual([...seen].sort(), ['community', 'flymail', 'standard']);
});


test('扫码期间不请求；框架配置更新后自动启动 SSE 并认领通知', async t => {
  const waitingConfig = { 'xiuxian-game': config['xiuxian-game'], 'qq-bot': {} };
  const app = createTestApp({ config: waitingConfig });
  t.after(() => app.dispose());
  t.after(() => stopNotificationStream());
  let notify: (() => void) | undefined;
  let stopped = 0;
  let fetches = 0;
  const requests: string[] = [];
  let wake!: () => void;
  const claimed = new Promise<void>(resolve => { wake = resolve; });
  t.mock.method(axios, 'create', () => ({ post: async (path: string) => {
    if (path.endsWith('/claim-next')) return { data: { claim: null, pending: false } };
    requests.push(path);
    if (requests.length === 3) wake();
    return { data: { data: path.endsWith('/community/claim') ? null : { event: null } } };
  } } as never));
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    fetches++;
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('event: stream.ready\ndata: {}\n\n'));
      options.signal?.addEventListener('abort', () => controller.close(), { once: true });
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const result = await app.runHandler(async () => {
    t.mock.method(getConfig(), 'onWatch', listener => {
      notify = () => listener(getConfig().value!);
      return () => { stopped++; };
    });
    await startFeatureVisibility();
    startNotificationStream();
    startNotificationStream();
    await assert.rejects(requestBackend('native', 'get_auth_profile'), /AppID 尚未就绪/);
    assert.equal(fetches, 0);
    assert.deepEqual(requests, []);
    assert.ok(notify);
    app.configure(config);
    notify();
    await claimed;
    assert.equal(fetches, 1);
    assert.equal(stopped, 1);
    stopNotificationStream();
  }, app.events.groupMessage({ platform: 'qq-bot', botId: '' }));
  assert.deepEqual(result.errors, []);
});

test('等待扫码期间销毁会取消配置订阅', async t => {
  const app = createTestApp({ config: { 'xiuxian-game': config['xiuxian-game'] } });
  t.after(() => app.dispose());
  let stopped = 0;
  const result = await app.runHandler(async () => {
    t.mock.method(getConfig(), 'onWatch', () => () => { stopped++; });
    startNotificationStream();
    stopNotificationStream();
    assert.equal(stopped, 1);
  }, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
});
