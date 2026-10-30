import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeShopQuoteContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
}).toString();
const rows = [...output.matchAll(/EXPOSE_SHOP_HTTP=([^|]+)\|([^|]+)\|(.+)/g)]
  .map(match => ({ action: match[1], input: JSON.parse(match[2]), envelope: JSON.parse(match[3]) }));

for (const action of ['preview_shop_purchase', 'confirm_shop_purchase']) test(`${action}: Go 原报价、越权/过期/变价拒绝及跨消息重放`, async t => {
  const fixtures = rows.filter(row => row.action === action);
  assert.ok(fixtures.length > 0);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = fixtures[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/shops.purchase');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: action === 'preview_shop_purchase' ? 'preview' : 'reference', ...current.input });
    assert.ok([...body.messageText].length <= 80);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const settled = new Map<string, unknown>();
  let success = 0;
  let refused = 0;
  let replayed = 0;
  for (current of fixtures) {
    const server = current.envelope.data;
    const bid = server.middleware.identity.bid;
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    success++;
    assert.deepEqual(actual.result, server.data);
    if (action === 'preview_shop_purchase') {
      assert.equal(actual.result.preview.paid, '20 SPIRIT_CRYSTAL');
      assert.equal(actual.result.preview.granted, 4);
      assert.equal(actual.result.preview.buyCount, 2);
      assert.equal(actual.result.preview.needsConfirmation, false);
      assert.ok(actual.result.reference.includes('_s_'));
      assert.equal(actual.result.preview.quoteDigest, undefined);
    } else {
      assert.equal(actual.result.result.paid, '20 SPIRIT_CRYSTAL');
      assert.equal(actual.result.result.granted, 4);
      if (settled.has(current.input.reference)) { replayed++; assert.deepEqual(actual.result, settled.get(current.input.reference)); }
      settled.set(current.input.reference, actual.result);
    }
  }
  assert.ok(success > 0);
  if (action === 'confirm_shop_purchase') { assert.equal(refused, 3); assert.equal(replayed, 1); }
});

test('同一消息重复商店预览读取新报价，重复确认保留原请求键', async t => {
  const preview = rows.find(row => row.action === 'preview_shop_purchase' && row.envelope.data.success);
  const confirm = rows.find(row => row.action === 'confirm_shop_purchase' && row.envelope.data.success);
  assert.ok(preview && confirm);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = preview;
  let count = 0;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(current.envelope);
    if (current.action === 'preview_shop_purchase' && count++ === 1) envelope.data.data.preview.paid = '30 SPIRIT_CRYSTAL';
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const first = await call(preview.action, preview.input);
  const second = await call(preview.action, preview.input);
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  assert.equal(second.value.ok, true, JSON.stringify(second.value));
  if (first.value.ok && second.value.ok) {
    assert.equal((first.value.data as any).result.preview.paid, '20 SPIRIT_CRYSTAL');
    assert.equal((second.value.data as any).result.preview.paid, '30 SPIRIT_CRYSTAL');
  }
  assert.notEqual(keys[0], keys[1]);
  current = confirm;
  const a = await call(confirm.action, confirm.input);
  const b = await call(confirm.action, confirm.input);
  assert.equal(a.value.ok, true, JSON.stringify(a.value));
  assert.equal(b.value.ok, true, JSON.stringify(b.value));
  assert.equal(keys[2], keys[3]);
});
