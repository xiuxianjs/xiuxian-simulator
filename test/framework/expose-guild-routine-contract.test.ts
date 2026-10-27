import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeGuildRoutineContracts|TestRobotBusinessExposeGuildExchangeSnapshot)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_GUILD_HTTP=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)]
  .map(match => ({ action: match[1], operation: match[2], input: JSON.parse(match[3]), envelope: JSON.parse(match[4]) }));
const actions = ['get_guild_daily', 'get_guild_weekly', 'claim_guild_milestone', 'claim_all_guild_milestones', 'get_guild_worship_options', 'worship_guild', 'get_guild_shop', 'exchange_guild_shop_item'];
for (const action of actions) test(`${action}: 真实 Go 任务/领奖/祭祀/原商品兑换`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0, action);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.ok([...body.messageText].length <= 80);
    if (action === 'worship_guild') assert.equal(body.messageText, '/祭祀祖师 灵石');
    if (action === 'claim_guild_milestone') assert.equal(body.arguments.expectedType, current.input.type);
    if (action === 'exchange_guild_shop_item') assert.deepEqual(body.arguments.expected, current.input.expected);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  let successes = 0;
  let refused = 0;
  let partial = 0;
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    successes++;
    const data = server.data;
    if (action === 'get_guild_worship_options' || action === 'worship_guild') {
      assert.deepEqual(actual.result, data.data);
      if (action === 'worship_guild') assert.equal(actual.result.cost, 5000);
    } else if (action === 'claim_guild_milestone') {
      assert.deepEqual(actual.result, { message: data.message, receipt: data.receipt });
      assert.equal(actual.result.receipt.type, current.input.type);
    } else if (action === 'get_guild_shop') {
      const expected = { ...data, items: data.items.map((item: any) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== null))) };
      assert.deepEqual(actual.result, expected);
    } else {
      assert.deepEqual(actual.result, data);
      if (data.partial) partial++;
      if (action === 'exchange_guild_shop_item') {
        assert.equal(actual.result.receipt.itemId, current.input.expected.shopItemId);
        assert.equal(actual.result.receipt.quantity, 2);
        assert.equal(actual.result.receipt.contributionDelta, -10);
        assert.equal(current.input.expected.priceContribution, 20);
      }
    }
  }
  assert.ok(successes > 0);
  if (action === 'exchange_guild_shop_item') assert.equal(refused, 6, '全部原商品快照字段须拒绝变更');
  if (action === 'claim_guild_milestone') assert.equal(refused, 1, '错类型不能发奖');
  if (action === 'claim_all_guild_milestones') assert.equal(partial, 1);
});

test('宗门兑换原商品字段顺序不改变当前消息重试键', async t => {
  const row = fixtures.find(row => row.action === 'exchange_guild_shop_item' && row.envelope.data.success);
  assert.ok(row);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const expected of [row.input.expected, Object.fromEntries(Object.entries(row.input.expected).reverse())]) {
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'exchange_guild_shop_item', { itemIndex: 1, expected }), 'ai-plugin');
    assert.equal(result.value.ok, true);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
  }
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
});
