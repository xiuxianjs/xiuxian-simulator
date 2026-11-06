import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBaseTypeQueries$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/BASE_TYPE_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
test('品阶与类型查询保留真实基础字段并隔离玩家参数', async t => {
  assert.equal(fixtures.length, 3);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = fixtures[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { page: 1, pageSize: 100, knownVersion: '' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const actions: Record<string, string> = { 'base.grades': 'get_base_grades', 'base.equipment-types': 'get_base_equipment_types', 'base.skill-types': 'get_base_skill_types' };
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of fixtures) {
    const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', actions[current.operation], input), 'ai-plugin');
    const run = await call({ pageSize: 100 }); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) assert.deepEqual((run.value.data as any).result, current.envelope.data.data);
    await call({ pageSize: 100 }); assert.notEqual(keys.at(-1), keys.at(-2));
    const count = keys.length;
    for (const input of [{ uid: 999 }, { table: 'users' }, { pageSize: 101 }]) assert.equal((await call(input)).value.ok, false);
    assert.equal(keys.length, count);
  }
});
