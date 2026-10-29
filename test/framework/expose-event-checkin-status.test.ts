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
const rows = [...output.matchAll(/ROBOT_EVENT_CHECKIN_STATUS=(.+)/g)].map(row => JSON.parse(row[1]).data);
assert.equal(rows.length, 2);
assert.equal(rows[0][0].canClaimToday, true);
assert.equal(rows[1][0].canClaimToday, false);
test('签到前后查询真实活动进度并绑定本人身份', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(request.headers['x-bid'], 'player');
    const path = new URL(request.url).pathname;
    const data = path === '/api/v1/robot/identity' ? { bid: 'player', account: { status: 'registered', playerId: 1 } } : current;
    if (path !== '/api/v1/robot/identity') assert.equal(path, '/api/v1/players/1/limited-events/check-ins');
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_limited_event_checkin_status', {}), 'ai-plugin');
    assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) assert.deepEqual(run.value.data, current);
  }
});
