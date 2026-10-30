import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('按丹方播种使用服务端实际事务回执并区分重试', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotCaveRecipePlant$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/EXPOSE_CAVE_RECIPE=([^|]+)\|(.+)/g)].map(match => ({ scenario: match[1], envelope: JSON.parse(match[2]) }));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  let expected: object = {};
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/cave.plant');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'plant_for_alchemy_recipe', input), 'ai-plugin');
  for (const [scenario, count] of [['1', 1], ['100', 100], ['locked', 10], ['no-seeds', 10], ['missing', 10]] as const) {
    current = rows.find(row => row.scenario === scenario)!;
    assert.ok(current, scenario);
    const recipeName = scenario === 'missing' ? '不存在丹' : '测试丹';
    expected = { recipeName, count: String(count) };
    const result = await call({ recipeName, count, intentId: scenario });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const actual = result.value.data as any;
      assert.equal(actual.success, current.envelope.data.success);
      if (actual.success) assert.equal(actual.result.message, current.envelope.data.data.result.message);
    }
    assert.equal((await call({ recipeName, count, intentId: scenario })).value.ok, true);
    assert.equal(keys.at(-1), keys.at(-2));
  }
  current = rows.find(row => row.scenario === '1')!;
  expected = { recipeName: '测试丹', count: '1' };
  await call({ recipeName: '测试丹', count: 1, intentId: 'new-run' });
  const newKey = keys.at(-1);
  await call({ recipeName: '测试丹', count: 1, intentId: '1' });
  assert.notEqual(keys.at(-1), newKey);
  const before = keys.length;
  for (const input of [{ recipeName: '测试丹', count: 0 }, { recipeName: '测试丹', count: 101 }, { recipeName: '错误 丹', count: 1 }]) {
    assert.equal((await call(input)).value.ok, false);
  }
  assert.equal(keys.length, before);
});
