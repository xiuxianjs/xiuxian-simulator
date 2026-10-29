import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeWudao$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_WUDAO_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ key: row[1], envelope: JSON.parse(row[2]) }));
test('功法悟道查询和消耗返回真实候选与结算', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let args: any; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/skill-books.wudao');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const key of ['options', 'spend']) {
    const fixture = fixtures.find(row => row.key === key); assert.ok(fixture); envelope = structuredClone(fixture.envelope);
    const label = key === 'options' ? '' : '物理攻击'; args = { bookId: '2', label };
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const action = key === 'options' ? 'get_wudao_options' : 'perform_skill_wudao';
    const input = key === 'options' ? { bookId: 2 } : { bookId: 2, label };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, JSON.stringify(response.value));
    if (response.value.ok && key === 'spend') { const result = (response.value.data as any).result.result; assert.equal(result.newMax, 20); assert.equal(result.remaining, 1); }
    await call(); if (key === 'options') assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (key === 'spend') { envelope.data.data.result.label = '暴击率'; assert.equal((await call()).value.ok, false); }
  }
});
