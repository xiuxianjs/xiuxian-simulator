import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const cwd = fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url));
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessStorylineRankingV1ParityAndReplay|TestRobotAlchemyLeaderboardReadsCurrentProfessionFacts)$', '-v', '-count=1'], { cwd, encoding: 'utf8' }).toString();
const story = [...output.matchAll(/ROBOT_STORYLINE_RANKING=(.+)/g)].map(row => JSON.parse(row[1])).filter(row => row.valid && row.page === 1);
const alchemyMatch = output.match(/ROBOT_ALCHEMY_LEADERBOARD=(.+)/);
assert.ok(story.length && alchemyMatch);
const alchemy = JSON.parse(alchemyMatch[1]);

for (const item of [
  { operation: 'leaderboard.storyline', action: 'get_storyline_leaderboard', args: { input: '/主线排行榜 1', top50: false }, rows: story.map(row => row.result), key: 'leaderboard' },
  { operation: 'leaderboard.alchemy', action: 'get_alchemy_leaderboard', args: { page: '1', top50: false }, rows: [alchemy], key: null }
]) {
  test(`${item.operation} 返回服务端榜单并刷新`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    let current = item.rows[0];
    const keys: string[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${item.operation}`);
      const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
      assert.deepEqual(body.arguments, item.args);
      keys.push(request.headers['idempotency-key']);
      return { status: 200, headers: {}, data: JSON.stringify({ data: current }) };
    } }));
    for (current of item.rows) {
      const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
      const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', item.action, {}), 'ai-plugin');
      const run = await call();
      assert.deepEqual(run.errors, []);
      assert.equal(run.value.ok, true, JSON.stringify(run.value));
      if (!run.value.ok) continue;
      const result = run.value.data as any;
      assert.equal(result.success, current.success);
      if (current.success && current.branch === 'business') {
        const board = item.key ? current.data[item.key] : current.data;
        assert.deepEqual(result.result.items, board.items);
        assert.deepEqual(result.result.nearby, board.nearby);
      } else assert.equal(result.result, undefined);
      const again = await call();
      assert.equal(again.value.ok, true);
      assert.notEqual(keys.at(-1), keys.at(-2));
    }
  });
}
