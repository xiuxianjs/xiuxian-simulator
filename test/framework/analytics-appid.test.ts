import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { onResponse, shutdownLogger, logger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import trackFeature from '../../src/response/mwFeatureTrack';
import { trackAction, trackLogin } from '../../src/analytics';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function fixture(t: TestContext, key: string, extra = {}, qq: Record<string, unknown> = { bots: { '102062268': {}, '222222222': {}, '333333333': {} } }) {
  const app = createTestApp({ config: { 'qq-bot': qq, 'xiuxian-game': {
    analytics_api_url: 'https://analytics.invalid', analytics_api_key: key, ...extra
  } } });
  t.after(() => app.dispose());
  return app;
}
function capture(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
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
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('offline'); });
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
  for (let i = 0; i < 4; i++) { t.mock.timers.tick(10000); await turn(); }
  assert.equal(calls, 6);
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


test('HTTP 400 和 HTTP 200 业务失败均记录服务端原因，不输出密钥或事件内容', async t => {
  capture(t);
  const errors: string[] = [];
  t.mock.method(logger, 'error', (...args: unknown[]) => { errors.push(args.map(String).join(' ')); });
  const responses = [
    new Response(JSON.stringify({ code: -1, message: '该 AppID 未配置游戏数据源' }), { status: 400 }),
    new Response(JSON.stringify({ code: -1, message: '写入失败: database unavailable' }), { status: 200 })
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
  assert.match(failures[0], /400.*appid=102062268.*该 AppID 未配置游戏数据源/);
  assert.match(failures[1], /200.*写入失败/);
  assert.ok(errors.every(line => !line.includes('private-upload-key') && !line.includes('private-event-content')));
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
