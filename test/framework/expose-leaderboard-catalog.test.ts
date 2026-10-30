import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { parseLeaderboardMenu } from '../../src/api/bot/leaderboard-catalog';
import { activeFeatureText, mentionsRetiredFeature } from '../../src/response/retiredFeatures';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessLeaderboardMenuV1ParityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_LEADERBOARD_MENU=(.+)/g)].map(row => JSON.parse(row[1]));

test('排行榜目录沿用服务端入口并过滤下架玩法', async t => {
  const fixture = fixtures.find(row => row.state === 'ready' && row.text === '/排行榜');
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/leaderboard.menu');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/排行榜'); assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: fixture.result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_leaderboard_catalog', {}), 'ai-plugin');
  const run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  const menu = parseLeaderboardMenu(fixture.result.data);
  if (run.value.ok) assert.deepEqual((run.value.data as any).result, { items: menu.items.filter(item => !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.label)), hint: activeFeatureText(menu.hint) });
  await call(); assert.notEqual(keys[0], keys[1]);
});
