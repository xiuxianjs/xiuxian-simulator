import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessEventCheckInStatesRewardsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_EVENT_CHECKIN_RESPONSE=checkin\.limited-event\|player\|(.+)/g)].map(row => JSON.parse(row[1]));
assert.ok(rows.some(row => row.data.success && row.data.branch === 'business'));
assert.ok(rows.some(row => !row.data.success));
test('限时签到返回实际奖励、拒绝和原消息重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/checkin.limited-event');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_limited_event', {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success && result.branch === 'business') assert.deepEqual(result.result, current.data.data);
    else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
