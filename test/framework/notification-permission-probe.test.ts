import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { dispatchCommunityNotifications } from '../../src/notification/communityDelivery';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { readNotificationBotRole, refreshNotificationPermission } from '../../src/notification/channel';

after(() => shutdownLogger());

test('并发角色检查等待同一次真实框架查询，后续命中快照', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
  t.after(() => app.dispose());
  const target = { platform: 'qq-bot', BotId: 'role-probe', scope: 'group' as const, targetId: 'concurrent' };
  let probes = 0;
  let queries = 0;
  t.mock.method(axios, 'create', () => ({ async post(path: string) {
    const data = path.endsWith('/permission/read') ? { state: null, raw: '' }
      : path.endsWith('/permission/probe') ? { previous: '', acquired: ++probes === 1 } : null;
    return { data: { data } };
  } }));
  app.actions.on('guild.bot.info', async () => {
    queries++;
    await new Promise<void>(resolve => setImmediate(resolve));
    return [createResult(ResultCode.Ok, 'ok', { role: 'admin', allowsProactiveMessages: true })];
  });
  const run = await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), () => Promise.all([readNotificationBotRole(target), readNotificationBotRole(target)]));
  assert.deepEqual(run.value, ['admin', 'admin']);
  assert.equal(run.actions.filter(action => action.name === 'guild.bot.info').length, 1);
  assert.equal(probes, 1);
  assert.equal(queries, 1);
  assert.equal(await readNotificationBotRole(target), 'admin');
  assert.equal(queries, 1);
});

test('冷却拒绝时不调用平台，已知权限缓存不申请查询额度', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
  t.after(() => app.dispose());
  const target = { platform: 'qq-bot', BotId: 'cooldown-probe', scope: 'group' as const, targetId: 'cooldown' };
  let probes = 0;
  let queries = 0;
  let state: unknown = null;
  t.mock.method(axios, 'create', () => ({ async post(path: string) {
    const data = path.endsWith('/permission/read') ? { state, raw: '' }
      : path.endsWith('/permission/probe') ? (probes++, { previous: '', acquired: false }) : null;
    return { data: { data } };
  } }));
  app.actions.on('guild.bot.info', () => { queries++; return [createResult(ResultCode.Fail, 'unexpected')]; });
  await assert.rejects(readNotificationBotRole(target), /查询冷却/);
  assert.equal(probes, 1);
  assert.equal(queries, 0);
  state = { state: 'allowed', source: 'query', updatedAt: Date.now() };
  assert.deepEqual(await refreshNotificationPermission(target), state);
  assert.equal(probes, 1);
  assert.equal(queries, 0);
});

test('官服多机器人中一个领取失败不阻断另一个', async t => {
  const app = createTestApp({ config: {
    'qq-bot': { bots: { '101': {}, '202': {} }, default_bot: '101' },
    'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } }
  } });
  t.after(() => app.dispose());
  const claimed: string[] = [];
  t.mock.method(axios, 'create', () => ({ async post(path: string, body: { botId: string }) {
    assert.ok(path.endsWith('/community/claim'));
    claimed.push(body.botId);
    if (body.botId === '101') throw new Error('first bot unavailable');
    return { data: { data: null } };
  } }));
  await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), () => dispatchCommunityNotifications());
  assert.deepEqual(claimed.sort(), ['101', '202']);
});

for (const deferredFirst of [false, true]) {
  test(`共享探测不共享调用者冷却策略 deferredFirst=${deferredFirst}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
    t.after(() => app.dispose());
    let probes = 0;
    t.mock.method(axios, 'create', () => ({ async post(path: string) {
      if (path.endsWith('/permission/probe')) {
        probes++;
        await new Promise<void>(resolve => setImmediate(resolve));
        return { data: { data: { previous: '', acquired: false } } };
      }
      assert.ok(path.endsWith('/permission/read'));
      return { data: { data: { state: null, raw: '' } } };
    } }));
    const target = { platform: 'qq-bot', BotId: '123', scope: 'group' as const, targetId: `mixed-${deferredFirst}` };
    const run = await app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), () => Promise.allSettled(
      [deferredFirst, !deferredFirst].map(deferred => refreshNotificationPermission(target, false, deferred))
    ));
    const normal = run.value[deferredFirst ? 1 : 0];
    const deferred = run.value[deferredFirst ? 0 : 1];
    assert.deepEqual(normal, { status: 'fulfilled', value: null });
    assert.equal(deferred.status, 'rejected');
    if (deferred.status === 'rejected') assert.match(deferred.reason.message, /查询冷却/);
    assert.equal(probes, 1);
    assert.equal(run.actions.length, 0);
  });
}
