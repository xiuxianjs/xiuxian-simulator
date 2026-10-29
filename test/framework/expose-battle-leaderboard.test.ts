import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBattleQueriesBoardsV1ParityAndGuards$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
for (const regional of [false, true]) {
const operation = regional ? 'leaderboard.battle-region' : 'leaderboard.battle';
const action = regional ? 'get_regional_battle_leaderboard' : 'get_battle_leaderboard';
const rows = [...output.matchAll(/ROBOT_BATTLE_QUERY_RESPONSE=(leaderboard\.battle(?:-region)?)\|([^|]+)\|([^|]+)\|(.+)/g)].filter(match => match[1] === operation).map(match => ({ args: JSON.parse(match[2]), envelope: JSON.parse(match[4]) })).filter(row => row.args.page === '1' && !row.args.top50);
assert.ok(rows.length > 0);
test(`${operation} 保留服务端榜单及拒绝，并允许同消息刷新`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { page: '1', top50: false });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []); assert.deepEqual(run.messages, []); assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.envelope.data.success);
    if (result.success && result.branch === 'business') {
      assert.deepEqual(result.result.list, current.envelope.data.data.leaderboard.list);
      assert.equal(result.result.building, current.envelope.data.data.leaderboard.building);
    } else assert.equal(result.result, undefined);
    const again = await call();
    assert.equal(again.value.ok, true);
    assert.notEqual(keys.at(-1), keys.at(-2));
  }
});

}
