import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { onResponse, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import trackFeature from '../../src/response/mwFeatureTrack';
import { trackAction, trackLogin } from '../../src/analytics';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function fixture(t: TestContext, key: string, extra = {}) {
  const app = createTestApp({ config: { 'xiuxian-game': {
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
    return new Response('{}');
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

test('缺失、非法和配置不匹配的 AppID 不上报，也不打断处理；无 QQ 身份可显式配置', async t => {
  const requests = capture(t);
  const app = fixture(t, 'key');
  const configured = fixture(t, 'key', { analytics_appid: '102062268' });
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
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.body.appid === '102062268' && request.body.events.length === 1));
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
  assert.equal(calls, 2);
});
