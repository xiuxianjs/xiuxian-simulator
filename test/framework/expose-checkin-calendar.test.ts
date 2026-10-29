import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCheckInViewIdentityAndReadOnly$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_CHECKIN_VIEW=(\d+)\|(.+)/g)].map(row => JSON.parse(row[2]));
assert.equal(rows.length, 2);

test('签到日历透传服务端日历，连续查询不复用旧快照', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let index = 0;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/checkin.view');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, index === 0 ? { page: 0, scope: 'daily' } : { page: 0, scope: 'overview' });
    assert.equal(body.messageText, index === 0 ? '/签到日历 日常' : '/签到概览');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(rows[index]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (index = 0; index < rows.length; index++) {
    const input = { scope: index === 0 ? 'daily' : 'overview' };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_checkin_calendar', input), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) assert.deepEqual((run.value.data as any).result, rows[index].data.data);
    await call();
    assert.notEqual(keys.at(-1), keys.at(-2));
  }
  const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_checkin_calendar', { scope: 'daily', uid: 2 }), 'ai-plugin');
  assert.equal(invalid.value.ok, false);
});
