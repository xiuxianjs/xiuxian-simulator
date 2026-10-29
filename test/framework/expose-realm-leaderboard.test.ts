import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessOtherBoardsV1ReadOnlyTopSelfRegionAndGates$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_OTHER_BOARD_RESPONSE=(leaderboard\.(?:realm(?:-region)?|popularity))\|([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ operation: m[1], envelope: JSON.parse(m[4]) }));
for (const action of ['get_realm_leaderboard', 'get_regional_realm_leaderboard', 'get_popularity_leaderboard'] as const) test(`${action}: 服务端榜单与资格`, async t => {
  const candidates = rows.filter(row => row.operation === (action === 'get_realm_leaderboard' ? 'leaderboard.realm' : action === 'get_regional_realm_leaderboard' ? 'leaderboard.realm-region' : 'leaderboard.popularity'));
  assert.ok(candidates.length);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = candidates[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of candidates) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []); assert.deepEqual(run.messages, []); assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const value = run.value.data as any;
    assert.equal(value.success, current.envelope.data.success);
    if (value.success && value.branch === 'business') assert.deepEqual(value.result.list, action === 'get_popularity_leaderboard' ? current.envelope.data.data.items : current.envelope.data.data.list);
    else assert.equal(value.result, undefined);
    const again = await call();
    assert.equal(again.value.ok, true);
    assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
