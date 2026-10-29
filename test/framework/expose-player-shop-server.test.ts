import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessPlayerShop(V1ReplayAndCommitBoundaries|VisitV1TargetsAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 }).toString();
const rows = [...output.matchAll(/ROBOT_PLAYER_SHOP_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], args: JSON.parse(m[2]), envelope: JSON.parse(m[4]) }));
const visits = [...output.matchAll(/ROBOT_SHOP_VISIT_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: 'player-shop.visit', args: JSON.parse(m[1]), envelope: JSON.parse(m[3]) }));
const success = (op: string, predicate: (data: any) => boolean = () => true) => rows.find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business' && row.envelope.data.data && predicate(row.envelope.data.data));
const cases = [
  { action: 'get_my_player_shop', input: {}, fixture: success('player-shop.mine') },
  { action: 'list_player_shops', input: { page: 1 }, fixture: success('player-shop.list', d => d.items.length > 0) },
  { action: 'get_player_shop_ranking', input: {}, fixture: success('player-shop.ranking', d => d.length > 0) },
  { action: 'visit_player_shop', input: { ownerUid: 2 }, fixture: visits.find(r => r.args.target?.uid === 2 && r.args.page === '1' && r.envelope.data.success) },
  { action: 'rename_player_shop', input: { name: '流云小筑' }, fixture: success('player-shop.rename', d => d.message.includes('流云小筑')) },
];
for (const c of cases) test(`${c.action} 保留真实服务端结果`, async t => {
  assert.ok(c.fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const row = c.fixture;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${row.op}`);
    assert.deepEqual(body.arguments, row.args);
    return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', c.action, c.input), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  assert.deepEqual(result.messages, []);
  if (!result.value.ok) return;
  const actual = (result.value.data as any).result;
  const source = row.envelope.data.data;
  if (c.action === 'get_my_player_shop') assert.equal(actual.shopId, source.shopId);
  if (c.action === 'list_player_shops') assert.equal(actual.data[0].userId, source.items[0].userId);
  if (c.action === 'get_player_shop_ranking') assert.equal(actual[0].heatScore, source[0].heatScore);
  if (c.action === 'visit_player_shop') { assert.equal(actual.shop.userId, 2); assert.equal(actual.items[0].listingId, source.items[0].listingId); assert.equal(actual.items[0].canPurchase, source.items[0].canPurchase); }
  if (c.action === 'rename_player_shop') assert.equal(actual.message, source.message);
});
