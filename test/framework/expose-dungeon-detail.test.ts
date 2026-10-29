import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDungeonQueriesV1ParityReadOnlyAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_DUNGEON_QUERY_RESPONSE=dungeon\.detail\|player\|(.+)/g)].map(row => JSON.parse(row[1])).filter(row => !row.data.success || row.data.data?.outcome === 'result');
assert.ok(rows.some(row => row.data.success) && rows.some(row => !row.data.success));
test('秘境详情保留消耗、掉落、状态和拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; let name = '桃花镇'; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.detail');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { name });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    name = current.data.success ? '桃花镇' : '不存在';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_dungeon_detail', { dungeonName: name }), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.data.success);
    if (result.success && result.branch === 'business') {
      const source = current.data.data.data;
      for (const field of ['id', 'name', 'usedToday', 'dailyLimit', 'freeRemaining', 'inTeam', 'hasCleared', 'spiritCost', 'currencyDrops', 'materialDrops', 'skillDrops']) assert.deepEqual(result.result[field], source[field]);
      if (source.firstClearReward) assert.deepEqual(result.result.firstClearReward, source.firstClearReward);
      else assert.equal(result.result.firstClearReward, undefined);
    } else assert.equal(result.result, undefined);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
