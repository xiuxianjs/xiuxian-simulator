import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('道途印证保留服务端对比、准入结果及刷新语义', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessSoulCompareV1ParityAndReplay/(xuan_fa|no-service)$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/ROBOT_SOUL_COMPARE=(.+)/g)].map(match => JSON.parse(match[1]));
  const active = rows.find(row => row.state === 'xuan_fa');
  const unavailable = rows.find(row => row.state === 'no-service');
  assert.ok(active && unavailable);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let row = active;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/soul-path.compare');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: row.result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_soul_path_comparison', {}), 'ai-plugin');
  const first = await call();
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) assert.deepEqual((first.value.data as any).result, active.result.data);
  const second = await call();
  assert.equal(second.value.ok, true, JSON.stringify(second.value));
  assert.notEqual(keys[0], keys[1]);
  row = unavailable;
  const denied = await call();
  assert.equal(denied.value.ok, true, JSON.stringify(denied.value));
  if (denied.value.ok) {
    assert.equal((denied.value.data as any).success, false);
    assert.equal((denied.value.data as any).result, undefined);
  }
});
