import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^(TestProfileResponseContractSerialization|TestMeridianActualResponseContract)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
}).toString();
const extract = (name: string) => {
  const match = output.match(new RegExp(name + '=(.+)'));
  assert.ok(match, `${name} missing`);
  return JSON.parse(match[1]) as Record<string, any>;
};
const profiles = extract('PROFILE_RESPONSE_FIXTURES');
const meridians = extract('MERIDIAN_ACTUAL_RESPONSE_FIXTURES');
const cases = [
  ...Object.entries(profiles).filter(([name]) => name.startsWith('own')).map(([name, row]) => ({ name, action: 'get_profile', uid: row.uid as number, data: row.data })),
  ...Object.entries(meridians).filter(([name]) => name.startsWith('view:')).map(([name, data]) => ({ name, action: 'get_meridians', uid: 1, data }))
];
assert.equal(cases.length, 10);
for (const fixture of cases) test(`Expose 接收实际 Go 序列化响应 ${fixture.name}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => ({ status: 200, headers: {}, data: JSON.stringify({ data: request.url.endsWith('/robot/identity') ? { bid: 'owner', account: { status: 'registered', playerId: fixture.uid } } : fixture.data }) }) }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', fixture.action, {}), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (!result.value.ok) return;
  const data = result.value.data as any;
  if (fixture.action === 'get_profile') {
    assert.equal(data.found, fixture.data.found);
    assert.equal(data.user?.experience, fixture.data.user?.experience);
    assert.deepEqual(data.mental, fixture.data.mental);
    assert.deepEqual(data.qi, fixture.data.qi);
  } else {
    assert.equal(data.TrueQi, fixture.data.TrueQi);
    assert.equal(data.canPulse, fixture.data.canPulse);
    assert.deepEqual(data.meridians, fixture.data.meridians);
    assert.deepEqual(data.current, fixture.data.current ?? undefined);
  }
});

test('经络连锁任务解析 Go 序列化状态和推进回执', async t => {
  const rows = Object.entries(meridians).filter(([name]) => name.startsWith('view:'));
  assert.ok(rows.length);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0][1];
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'next', command: '我的资料' }, entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } }, data: current } }) }) }));
  for (const [, data] of rows) {
    current = data;
    const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_meridians', { taskInput: '经络' }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { assert.equal((run.value.data as any).result.TrueQi, data.TrueQi); assert.deepEqual((run.value.data as any).result.meridians, data.meridians); assert.equal((run.value.data as any).taskContinuation.outcome, 'next'); }
  }
});
