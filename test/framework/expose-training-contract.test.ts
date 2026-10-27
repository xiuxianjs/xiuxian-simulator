import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^(TestRobotMeditationAdapterContractSerialization|TestMeridianActualResponseContract)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
}).toString();
const extract = (name: string) => {
  const match = output.match(new RegExp(name + '=(.+)'));
  assert.ok(match, `${name} missing`);
  return JSON.parse(match[1]) as Record<string, any>;
};
const cases = [
  ...Object.entries(extract('MEDITATION_ADAPTER_FIXTURES')).filter(([name]) => /^(start|settle)/.test(name)).map(([name, data]) => ({ name, data, action: name.startsWith('start') ? 'start_meditation' : 'end_meditation', operation: name.startsWith('start') ? 'meditation.start' : 'meditation.end' })),
  ...Object.entries(extract('MERIDIAN_ACTUAL_RESPONSE_FIXTURES')).filter(([name]) => name.startsWith('pulse:')).map(([name, data]) => ({ name, data, action: 'pulse_meridian', operation: 'meridians.pulse' }))
];
assert.ok(cases.length >= 15);
for (const fixture of cases) test(`Expose 修炼实际服务端契约 ${fixture.name}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${fixture.operation}`);
    const middleware = {
      outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'owner', account: { status: 'registered', playerId: 1 } },
      replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false }
    };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: fixture.data } }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', fixture.action, {}), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (!result.value.ok) return;
  const actual = (result.value.data as any).result;
  if (fixture.action === 'pulse_meridian') {
    for (const key of ['Progress', 'RequiredProgress', 'trueQiRemaining', 'dailyPulseRemaining', 'jumped', 'allCompleted', 'canPulse']) assert.equal(actual[key], fixture.data[key]);
    assert.deepEqual(actual.phases, fixture.data.phases);
  } else {
    assert.equal(actual.success, fixture.data.success);
    assert.equal(actual.message, fixture.data.message);
    assert.equal(actual.maxDurationMinutes, fixture.data.maxDurationMinutes);
    assert.deepEqual(actual.boost, fixture.data.boost ?? undefined);
    if (fixture.action === 'end_meditation') for (const key of ['qiGained', 'expGained', 'creditedExperience', 'totalQi']) assert.equal(actual[key], fixture.data[key]);
    else assert.equal(actual.alreadyMeditating, fixture.data.alreadyMeditating);
  }
});
