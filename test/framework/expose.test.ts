import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const backend = { api_url: 'https://backend.invalid', robot_auth_token: 'test-token' };
const access = { enabled: true, allowed_callers: ['ai-plugin'] };
const client = Expose.create();
const call = (input: unknown = {}) => client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_attributes', input);
const fields = 'maxAttributeBonus strength maxStrength intelligence maxIntelligence constitution maxConstitution agility maxAgility luck maxLuck combatPower physicalAttack physicalDefense magicAttack magicDefense spiritualPower mentalPower hp speed critRate critDamage antiCritRate hitRate dodgeRate'.split(' ');
const panel = { ...Object.fromEntries(fields.map(key => [key, 12])), uid: 7, daoName: '道友', realmName: '炼气', theme: null, access: { canUseMeridian: false, canUseSoulArtifact: false, canUseSoulPath: false } };

for (const scenario of ['success', 'default config', 'default enabled', 'extra uid', 'unregistered', 'wrong player', 'server failure', 'cancelled'] as const) {
  test(`Expose 查询真实身份和属性链路: ${scenario}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend, expose: scenario === 'default config' ? undefined : scenario === 'default enabled' ? { allowed_callers: ['ai-plugin'] } : access } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    const requests: any[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      requests.push(request);
      const isPanel = request.url.endsWith('/players/7/attribute-panel');
      assert.equal(request.method, 'GET');
      assert.ok(request.signal instanceof AbortSignal);
      assert.equal(request.headers['x-bid'], 'owner');
      const data = isPanel ? { ...panel, uid: scenario === 'wrong player' ? 8 : 7 } : { bid: 'owner', account: scenario === 'unregistered' ? { status: 'unregistered', playerId: null } : { status: 'registered', playerId: 7 } };
      return { status: scenario === 'server failure' ? 503 : 200, headers: {}, data: JSON.stringify({ data }) };
    } }));
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => {
      if (scenario === 'cancelled') return client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_attributes', {}, { signal: AbortSignal.abort() });
      return call(scenario === 'extra uid' ? { uid: 999 } : {});
    }, 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    if (['success', 'default config', 'default enabled'].includes(scenario)) {
      assert.equal(result.value.ok, true);
      if (!result.value.ok) return;
      const data = result.value.data as Record<string, unknown>;
      assert.equal(data.uid, 7);
      assert.equal(data.combatPower, 12);
      assert.equal(data.daoName, '道友');
      assert.equal('theme' in data, false);
      assert.equal(requests.length, 2);
    } else {
      assert.equal(result.value.ok, false);
      if (result.value.ok) return;
      assert.equal(result.value.error.code, scenario === 'extra uid' ? 'INVALID_INPUT' : scenario === 'cancelled' ? 'ABORTED' : scenario === 'unregistered' ? 'FORBIDDEN' : 'HANDLER_FAILED');
      assert.equal(requests.length, ['extra uid', 'cancelled'].includes(scenario) ? 0 : scenario === 'wrong player' ? 2 : 1);
    }
  });
}

for (const scenario of ['disabled', 'caller', 'no event', 'event denied', 'other platform', 'channel mismatch', 'malformed config', 'empty allowlist', 'invalid enabled', 'invalid config'] as const) {
  test(`Expose 在请求前拒绝未授权调用: ${scenario}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': {
      backend: scenario === 'channel mismatch' ? { ...backend, channel_mode: true } : backend,
      expose: scenario === 'disabled' ? { ...access, enabled: false } : scenario === 'empty allowlist' ? { allowed_callers: [] } : scenario === 'invalid enabled' ? { enabled: 'true' } : scenario === 'invalid config' ? null : scenario === 'malformed config' ? { enabled: true, allowed_callers: 'ai-plugin' } : access,
      ...(scenario === 'event denied' ? { events: { allow: [] } } : {})
    } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    t.mock.method(axios, 'create', () => { throw new Error('forbidden request'); });
    let startupResult: Awaited<ReturnType<typeof call>> | undefined;
    if (scenario === 'no event') await app.mount({}, { onCreated: async () => { startupResult = await call(); } }, 'ai-plugin');
    const value = scenario === 'no event' ? startupResult! : (await app.invoke(app.events.privateMessage({ platform: scenario === 'other platform' ? 'other' : 'qq-bot', userId: 'owner', botId: '999' }), () => call(), scenario === 'caller' ? 'other-plugin' : 'ai-plugin')).value;
    assert.equal(value.ok, false);
    if (!value.ok) assert.equal(value.error.code, 'FORBIDDEN');
  });
}

test('Expose 随插件卸载失效', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot' });
  assert.equal((await app.invoke(event, () => client.list(GAME_EXPOSE_PROTOCOL).length)).value, 1);
  await app.unmount('xiuxian-game');
  assert.equal((await app.invoke(event, () => client.list(GAME_EXPOSE_PROTOCOL).length)).value, 0);
  assert.equal((await app.invoke(event, () => call())).value.ok, false);
});

test('取消正在进行的身份查询会终止 HTTP，且不再请求属性', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend, expose: access } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const controller = new AbortController();
  let count = 0;
  let aborted = false;
  t.mock.method(axios, 'create', () => ({ request: (request: any) => new Promise((_resolve, reject) => {
    count++;
    request.signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); }, { once: true });
    controller.abort();
  }) }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_attributes', {}, { signal: controller.signal }), 'ai-plugin');
  assert.equal(result.value.ok, false);
  if (!result.value.ok) assert.equal(result.value.error.code, 'ABORTED');
  assert.equal(count, 1);
  assert.equal(aborted, true);
  assert.deepEqual(result.messages, []);
});
