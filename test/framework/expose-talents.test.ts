import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeTalents$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_TALENT_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ bid: row[1], envelope: JSON.parse(row[2]) }));
test('天赋查询保留未发放、实际天赋和启用状态', async t => {
  assert.equal(fixtures.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let fixture = fixtures[0]; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/talents.query');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const row of fixtures) {
    fixture = row; envelope = structuredClone(row.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: fixture.bid });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_talents', {}), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, JSON.stringify(response.value));
    if (response.value.ok) assert.deepEqual((response.value.data as any).result, row.envelope.data.data);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
    if (row.envelope.data.data.granted) { envelope.data.data.talents[0].category = '未知'; assert.equal((await call()).value.ok, false); }
  }
});
