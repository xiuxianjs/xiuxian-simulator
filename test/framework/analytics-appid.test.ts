import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AnalyticsOutbox } from '../../src/analytics/outbox';
import { after, test, type TestContext } from 'node:test';
import { onResponse, shutdownLogger, logger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import trackFeature from '../../src/response/mwFeatureTrack';
import { finishRobotBusiness } from '../../src/response/robotBusiness';
import { parseRobotBusinessEnvelope } from '../../src/api/bot/robot-business';
import { businessEnvelope } from './fixture';
import { getAnalyticsDeliveryStatus, startAnalyticsDelivery, stopAnalyticsDelivery, trackAction, trackLogin } from '../../src/analytics';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function fixture(t: TestContext, key: string, extra = {}, qq: Record<string, unknown> = { bots: { '102062268': {}, '222222222': {}, '333333333': {} } }) {
  const app = createTestApp({ config: { 'qq-bot': qq, 'xiuxian-game': {
    analytics_api_url: 'https://analytics.invalid', analytics_api_key: key, ...extra
  } } });
  t.after(() => app.dispose());
  return app;
}
function capture(t: TestContext, withDate = false) {
  t.mock.timers.enable({ apis: withDate ? ['setTimeout', 'Date'] : ['setTimeout'] });
  const requests: { url: string; key: string; body: { appid: string; events: Record<string, unknown>[] } }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, key: (init.headers as Record<string, string>)['X-API-Key'], body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ code: 0, data: { received: JSON.parse(String(init.body)).events.length } }));
  });
  return requests;
}

test('真实功能中间件按 AppID 分批，延迟发送保留各运行实例的密钥；同 UID 登录分别去重', async t => {
  const requests = capture(t);
  const a = fixture(t, 'official-key');
  const b = fixture(t, 'operator-key');
  const handler = onResponse('message.create', async event => {
    Object.assign(event, { uid: 7 });
    assert.equal(trackFeature(event), true);
    await turn();
    trackAction(7, 'test', '日常', 'success');
    trackLogin(7);
    trackLogin(7);
  });
  const eventA = a.events.groupMessage({ text: '/签到', platform: 'qq-bot' });
  const eventB = b.events.groupMessage({ text: '/签到', platform: 'qq-bot' });
  Object.assign(eventA, { BotId: '102062268', ChannelId: 'official-group' });
  Object.assign(eventB, { BotId: '222222222', ChannelId: 'operator-group' });
  const results = await Promise.all([a.runHandler(handler, eventA), b.runHandler(handler, eventB)]);
  results.forEach(result => assert.deepEqual(result.errors, []));
  assert.equal(requests.length, 0);
  t.mock.timers.tick(8000);
  await turn();
  assert.equal(requests.length, 4);
  for (const [appid, key, channel] of [['102062268', 'official-key', 'official-group'], ['222222222', 'operator-key', 'operator-group']]) {
    const batch = requests.filter(request => request.body.appid === appid);
    assert.equal(batch.length, 2);
    batch.forEach(request => {
      assert.equal(request.key, key);
      assert.ok(request.url.endsWith(`?appid=${appid}`));
      assert.ok(request.url.includes('/api/v2/track/'));
      assert.ok(request.body.events.every(event => event.channel_id === channel && event.uid === 7));
    });
    assert.equal(batch.find(request => request.url.includes('/features'))?.body.events.length, 1);
    const actions = batch.find(request => request.url.includes('/actions'))!.body.events;
    assert.equal(actions.length, 2);
    assert.equal(actions.filter(event => event.action === 'login').length, 1);
  }
});

test('功能上报保留真实失败和处理耗时，省略原始参数', async t => {
  const requests = capture(t);
  const app = fixture(t, 'key');
  const handler = onResponse('message.create', async event => {
    const result = parseRobotBusinessEnvelope(businessEnvelope(event.UserId, undefined), event.UserId, value => value);
    const outcome = await finishRobotBusiness(event, result, () => assert.fail('业务拒绝不应继续路由'), undefined, true, 'tribulation.command', performance.now() - 10);
    assert.deepEqual(outcome, { handled: true });
  });
  const event = app.events.groupMessage({ text: '/渡劫开劫 example-private-reference', platform: 'qq-bot' });
  Object.assign(event, { BotId: '102062268' });
  assert.deepEqual((await app.runHandler(handler, event)).errors, []);
  t.mock.timers.tick(5000);
  await turn();

  const [entry] = requests[0].body.events;
  assert.equal(entry.feature_name, '渡劫开劫');
  assert.equal(entry.command_text, '/渡劫开劫');
  assert.equal(entry.success, false);
  assert.ok(Number(entry.response_time_ms) > 0);
});

test('缺失、非法或非 QQ 事件身份不上报，不使用额外手填 AppID', async t => {
  const requests = capture(t);
  const app = fixture(t, 'key');
  const configured = fixture(t, 'key', {}, { app_id: '102062268' });
  let completed = 0;
  const handler = onResponse('message.create', event => {
    Object.assign(event, { uid: 8 });
    trackFeature(event);
    trackAction(8, 'test', '日常', 'success');
    completed++;
  });
  for (const [runtime, bot, platform] of [
    [app, '', 'qq-bot'], [app, 'not-an-appid', 'qq-bot'],
    [configured, '222222222', 'qq-bot'], [configured, 'adapter-id', 'other']
  ] as const) {
    const event = runtime.events.groupMessage({ text: '/签到', platform });
    Object.assign(event, { BotId: bot });
    assert.deepEqual((await runtime.runHandler(handler, event)).errors, []);
  }
  t.mock.timers.tick(8000);
  await turn();
  assert.equal(completed, 4);
  assert.equal(requests.length, 0);
});

test('上报网络失败不会成为游戏处理异常，满批后后续事件仍能发送', async t => {
  capture(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    calls++;
    if (calls <= 6) throw new Error('offline');
    return new Response(JSON.stringify({ code: 0, data: { received: JSON.parse(String(init.body)).events.length } }));
  });
  t.mock.method(Math, 'random', () => 0);
  const app = fixture(t, 'key');
  const event = app.events.groupMessage({ platform: 'qq-bot' });
  Object.assign(event, { BotId: '333333333' });
  const result = await app.runHandler(onResponse('message.create', () => {
    for (let i = 0; i < 31; i++) trackAction(9, 'test', '日常', 'success');
  }), event);
  assert.deepEqual(result.errors, []);
  assert.equal(calls, 1);
  t.mock.timers.tick(8000);
  await turn();
  assert.ok(calls >= 2);
  for (let i = 0; i < 5; i++) { t.mock.timers.tick(10000); await turn(); }
  assert.equal(calls, 8);
  assert.equal(getAnalyticsDeliveryStatus().retrying, 0);
});


test('扫码未完成不产生统计请求，框架补全 AppID 后自动上报', async t => {
  const requests = capture(t);
  const app = fixture(t, 'key', {}, { app_id: '' });
  const handler = onResponse('message.create', () => trackAction(18, 'test', '日常', 'success'));
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '102062268' });
  assert.deepEqual((await app.runHandler(handler, event)).errors, []);
  t.mock.timers.tick(8000);
  await turn();
  assert.equal(requests.length, 0);
  app.configure({ 'qq-bot': { app_id: '102062268' }, 'xiuxian-game': {
    analytics_api_url: 'https://analytics.invalid', analytics_api_key: 'key'
  } });
  assert.deepEqual((await app.runHandler(handler, event)).errors, []);
  t.mock.timers.tick(8000);
  await turn();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.appid, '102062268');
  assert.equal(requests[0].body.events.length, 1);
});


test('HTTP 400 和 HTTP 200 业务拒绝不会自动重试，日志仅保留受控错误码', async t => {
  capture(t);
  const errors: string[] = [];
  t.mock.method(logger, 'error', (...args: unknown[]) => { errors.push(args.map(String).join(' ')); });
  const responses = [
    new Response(JSON.stringify({ code: -1, reason: 'unknown_appid', message: 'private-upload-key' }), { status: 400 }),
    new Response(JSON.stringify({ code: -1, reason: 'private-event-content', message: 'database unavailable' }), { status: 200 })
  ];
  t.mock.method(globalThis, 'fetch', async () => responses.shift()!);
  const app = fixture(t, 'private-upload-key');
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '102062268' });
  for (let i = 0; i < 2; i++) {
    const result = await app.runHandler(onResponse('message.create', () => {
      trackAction(7, 'test', '日常', 'success', 0, { privateText: 'private-event-content' });
    }), event);
    assert.deepEqual(result.errors, []);
    t.mock.timers.tick(8000);
    await turn();
  }
  const failures = errors.filter(line => line.includes("上报失败"));
  assert.equal(failures.length, 2);
  assert.match(failures[0], /400.*appid=102062268.*unknown_appid/);
  assert.match(failures[1], /200.*invalid_receipt/);
  t.mock.timers.tick(300000);
  await turn();
  assert.equal(errors.filter(line => line.includes('上报失败')).length, 2);
  assert.ok(errors.every(line => !line.includes('private-upload-key') && !line.includes('private-event-content') && !line.includes('database unavailable')));
});


test('响应丢失后使用原批次号和原内容重试，成功回执后停止', async t => {
  capture(t);
  const requests: { body: string; key: string; url: string }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, body: String(init.body), key: (init.headers as Record<string,string>)['Idempotency-Key'] });
    if (requests.length === 1) throw new Error('response lost after commit');
    return new Response(JSON.stringify({ code: 0, data: { received: 1, replayed: true } }));
  });
  const app = fixture(t, 'key');
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '102062268' });
  assert.deepEqual((await app.runHandler(onResponse('message.create', () => trackAction(7, 'test', '日常', 'success')), event)).errors, []);
  t.mock.timers.tick(8000); await turn();
  assert.equal(requests.length, 1);
  t.mock.timers.tick(1000); await turn();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.ok(requests[0].key.length > 0);
  assert.match(requests[0].url, /\/actions\/batches\?appid=/);
  t.mock.timers.tick(30000); await turn();
  assert.equal(requests.length, 2);
});


test('临时故障超过三次后自动补报，遵守 Retry-After 且不改批次身份', async t => {
  capture(t);
  t.mock.method(Math, 'random', () => 0);
  const requests: { body: string; id: string; url: string }[] = [];
  const before = getAnalyticsDeliveryStatus();
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, body: String(init.body), id: (init.headers as Record<string, string>)['Idempotency-Key'] });
    if (requests.length === 1) return new Response('{}', { status: 429, headers: { 'Retry-After': '4' } });
    if (requests.length === 2) return new Response('{}', { status: 503 });
    if (requests.length === 3) return new Response('invalid response');
    return new Response(JSON.stringify({ code: 0, data: { received: 1, replayed: true } }));
  });
  const app = fixture(t, 'key');
  const event = app.events.groupMessage({ platform: 'qq-bot', botId: '102062268' });
  assert.deepEqual((await app.runHandler(onResponse('message.create', () => trackAction(7, 'test', '日常', 'success')), event)).errors, []);
  for (const [ms, expected] of [[8000, 1], [3999, 1], [1, 2], [2000, 3], [29999, 3], [1, 4], [300000, 4]]) {
    t.mock.timers.tick(ms);
    await turn();
    assert.equal(requests.length, expected);
  }
  assert.ok(requests.every(request => JSON.stringify(request) === JSON.stringify(requests[0])));
  assert.ok(requests[0].id);
  assert.deepEqual(getAnalyticsDeliveryStatus(), before);
});

test('离线积压落盘，重启仅用当前匹配路由的密钥重放，确认后从磁盘移除', async t => {
  capture(t, true);
  const directory = mkdtempSync(join(tmpdir(), 'robot-analytics-'));
  t.after(() => {
    stopAnalyticsDelivery();
    rmSync(directory, { recursive: true, force: true });
  });
  stopAnalyticsDelivery();
  const old = fixture(t, 'old-secret', { analytics_queue_dir: directory });
  const current = fixture(t, 'rotated-secret', { analytics_queue_dir: directory });
  const other = fixture(t, 'other-secret', { analytics_queue_dir: directory, analytics_api_url: 'https://other.invalid' });
  const event = (app: typeof old) => app.events.groupMessage({ text: '/签到', platform: 'qq-bot', botId: '102062268' });
  const start = onResponse('message.create', () => startAnalyticsDelivery());
  const produce = onResponse('message.create', e => {
    startAnalyticsDelivery();
    Object.assign(e, { uid: 7 });
    trackFeature(e);
  });
  const requests: { url: string; id: string; body: string; key: string }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    requests.push({ url, id: headers['Idempotency-Key'], body: String(init.body), key: headers['X-API-Key'] });
    if (requests.length <= 2) throw new Error('offline or acknowledgement lost');
    return new Response(JSON.stringify({ code: 0, data: { received: 1, replayed: true } }));
  });

  assert.deepEqual((await old.runHandler(produce, event(old))).errors, []);
  t.mock.timers.tick(5000);
  await turn();
  assert.equal(requests.length, 1);
  stopAnalyticsDelivery();
  assert.ok(!readFileSync(join(directory, 'batches.sqlite')).includes(Buffer.from('old-secret')));

  assert.deepEqual((await other.runHandler(start, event(other))).errors, []);
  t.mock.timers.tick(1000);
  await turn();
  assert.equal(requests.length, 1);
  stopAnalyticsDelivery();

  assert.deepEqual((await current.runHandler(start, event(current))).errors, []);
  await turn();
  assert.equal(requests.length, 2);
  stopAnalyticsDelivery();

  assert.deepEqual((await current.runHandler(start, event(current))).errors, []);
  await turn();
  assert.equal(requests.length, 2);
  t.mock.timers.tick(2000);
  await turn();
  assert.equal(requests.length, 3);
  for (const request of requests.slice(1)) {
    assert.deepEqual(request, { ...requests[0], key: 'rotated-secret' });
  }
  assert.equal(getAnalyticsDeliveryStatus().pending, 0);
  stopAnalyticsDelivery();

  assert.deepEqual((await current.runHandler(start, event(current))).errors, []);
  assert.equal(getAnalyticsDeliveryStatus().pending, 0);
  assert.equal(requests.length, 3);
});

test('持久队列达到 AppID 容量后拒绝新批次，保留待确认批次和其他 AppID 的容量', t => {
  const directory = mkdtempSync(join(tmpdir(), 'robot-analytics-limit-'));
  const store = new AnalyticsOutbox(directory);
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const batch = { id: '', apiUrl: 'https://analytics.invalid', appid: '102062268', body: '{}', count: 1, attempts: 0, retryAt: 0, held: 0 };
  for (let i = 0; i < 100; i++) assert.equal(store.put('features', { ...batch, id: String(i) }), true);
  assert.equal(store.put('features', { ...batch, id: 'overflow' }), false);
  assert.equal(store.put('features', { ...batch, id: 'other', appid: '222222222' }), true);
  assert.equal(store.list('features').length, 101);
  assert.equal(store.list('features')[0].id, '0');
});

test('旧密钥被拒后暂停原批次，配置新密钥后自动重放', async t => {
  capture(t, true);
  const directory = mkdtempSync(join(tmpdir(), 'robot-analytics-key-'));
  t.after(() => {
    stopAnalyticsDelivery();
    rmSync(directory, { recursive: true, force: true });
  });
  stopAnalyticsDelivery();
  const old = fixture(t, 'old-secret', { analytics_queue_dir: directory });
  const current = fixture(t, 'new-secret', { analytics_queue_dir: directory });
  const event = (app: typeof old) => app.events.groupMessage({ text: '/签到', platform: 'qq-bot', botId: '102062268' });
  const start = onResponse('message.create', () => startAnalyticsDelivery());
  const requests: { id: string; body: string; key: string }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    requests.push({ id: headers['Idempotency-Key'], body: String(init.body), key: headers['X-API-Key'] });
    if (headers['X-API-Key'] === 'old-secret') return new Response(JSON.stringify({ code: -1, reason: 'invalid_api_key' }), { status: 401 });
    return new Response(JSON.stringify({ code: 0, data: { received: 1, replayed: true } }));
  });
  const produce = onResponse('message.create', e => {
    startAnalyticsDelivery();
    Object.assign(e, { uid: 7 });
    trackFeature(e);
  });
  assert.deepEqual((await old.runHandler(produce, event(old))).errors, []);
  t.mock.timers.tick(5000);
  await turn();
  assert.equal(getAnalyticsDeliveryStatus().retained, 1);
  assert.deepEqual((await old.runHandler(start, event(old))).errors, []);
  t.mock.timers.tick(300000);
  await turn();
  assert.equal(requests.length, 1);
  stopAnalyticsDelivery();
  assert.deepEqual((await current.runHandler(start, event(current))).errors, []);
  await turn();
  assert.equal(getAnalyticsDeliveryStatus().pending, 0);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1], { ...requests[0], key: 'new-secret' });
});
