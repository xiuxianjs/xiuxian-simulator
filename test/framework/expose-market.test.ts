import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessMarketQueriesV1ReplayAndCommitBoundaries$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_MARKET_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[3]) }));
test('珍宝楼查询和下架保留服务端结果与重试语义', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let envelope: any; let args: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected] of [
    ['market.browse', 'browse_market', {}, { view: 'browse', categoryType: '', categorySubtype: '', keyword: '', sort: 'latest', page: '1' }],
    ['market.my-listings', 'get_my_market_listings', {}, { page: 1 }],
    ['market.credibility', 'get_market_credibility', {}, {}]
  ] as const) {
    op = operation; args = expected;
    const row = rows.find(row => row.op === op && row.envelope.data.success && (op !== 'market.browse' || row.args.sort === 'latest') && (op !== 'market.my-listings' || row.args.page === 1));
    assert.ok(row); envelope = row.envelope;
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const actual = (result.value.data as any).result; const expectedResult = envelope.data.data;
      if (op === 'market.credibility') assert.equal(actual.totalScore, expectedResult.totalScore);
      else { assert.equal(actual.items.length, expectedResult.items.length); assert.equal(actual.items[0]?.listingId, expectedResult.items[0]?.listingId); }
    }
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
  op = 'market.cancel'; args = { listingId: 7 }; envelope = structuredClone(envelope); envelope.data.data = { message: '已下架' };
  const cancel = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'cancel_market_listing', { listingId: 7 }), 'ai-plugin');
  const result = await cancel(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.message, '已下架');
  await cancel(); assert.equal(keys.at(-1), keys.at(-2));
});

test('交易记录与购买只读预览使用服务端契约', async t => {
  const previewOutput = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotMarketExposePreviewNeverPurchases$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const previewEnvelope = JSON.parse(previewOutput.match(/ROBOT_MARKET_EXPOSE_PREVIEW=(.+)/)![1]);
  const record = rows.find(row => row.op === 'market.records' && row.args.mode === 'buy' && row.args.page === '2'); assert.ok(record);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = 'market.records'; let args: any = { mode: 'buy', page: '2' }; let envelope = record.envelope;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const records = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_market_records', { mode: 'buy', page: 2 }), 'ai-plugin');
  assert.equal(records.value.ok, true, JSON.stringify(records.value));
  if (records.value.ok) assert.equal((records.value.data as any).result.total, envelope.data.data.total);
  op = 'market.purchase'; args = { listingId: 10, quantity: 2, confirmed: false, previewOnly: true }; envelope = previewEnvelope;
  const preview = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'preview_market_purchase', { listingId: 10, quantity: 2 }), 'ai-plugin');
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (preview.value.ok) assert.equal((preview.value.data as any).result.preview.totalPrice, 40);
});

test('筛选珍宝楼并查询可上架物品与价格范围', async t => {
  const sellOutput = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotMarketExposeSellQueries$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const sellRows = [...sellOutput.matchAll(/ROBOT_MARKET_EXPOSE_SELL=([^|]+)\|(.+)/g)].map(row => ({ kind: row[1], envelope: JSON.parse(row[2]) }));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = 'market.browse'; let args: any = { view: 'browse', categoryType: 'prop', categorySubtype: '', keyword: '', sort: 'latest', page: '1' };
  let envelope = rows.find(row => row.op === 'market.browse' && row.args.sort === 'latest')!.envelope;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const invoke = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const filtered = await invoke('browse_market', { category: 'prop' }); assert.equal(filtered.value.ok, true, JSON.stringify(filtered.value));
  op = 'market.sell'; args = { mode: 'list', category: 'prop', subtype: '', page: '1' }; envelope = sellRows.find(row => row.kind === 'list')!.envelope;
  const assets = await invoke('get_market_sellable_assets', { category: 'prop' }); assert.equal(assets.value.ok, true, JSON.stringify(assets.value));
  if (assets.value.ok) assert.equal((assets.value.data as any).result.items.length, envelope.data.data.items.length);
  args = { mode: 'start', category: 'prop', userItemId: 2, firstNumber: null, secondNumber: null }; envelope = sellRows.find(row => row.kind === 'range')!.envelope;
  const range = await invoke('get_market_listing_price_range', { category: 'prop', userItemId: 2 }); assert.equal(range.value.ok, true, JSON.stringify(range.value));
  if (range.value.ok) assert.deepEqual((range.value.data as any).result.range, envelope.data.data.range);
});

test('精确上架数量与价格，重试复用当前消息幂等键', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotMarketExposeSellExactAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const saleRows = [...output.matchAll(/ROBOT_MARKET_EXPOSE_SALE=(\d+)\|(.+)/g)].map(row => JSON.parse(row[2]));
  assert.equal(saleRows.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }); let index = 0; const keys: string[] = [];
  const inputs = [{ category: 'prop', userItemId: 2, quantity: 2, unitPrice: 20 }, { category: 'equipment', userItemId: 1, quantity: 1, unitPrice: 20 }];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/market.sell');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { ...inputs[index], mode: 'expose' }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(saleRows[index]) };
  } }));
  for (index = 0; index < inputs.length; index++) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'create_market_listing', inputs[index]), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result.listingId, saleRows[index].data.data.listingId);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('购买原报价引用与结算回执贯通', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotMarketExposeReferenceQuoteReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const previewEnvelope = JSON.parse(output.match(/ROBOT_MARKET_REFERENCE_PREVIEW=(.+)/)![1]);
  const confirmEnvelope = JSON.parse(output.match(/ROBOT_MARKET_REFERENCE_CONFIRM=(.+)/)![1]);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }); let confirming = false; const keys: string[] = [];
  const ref = previewEnvelope.data.data.reference;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, confirming ? { reference: ref } : { listingId: 10, quantity: 2, referencePreview: true });
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(confirming ? confirmEnvelope : previewEnvelope) };
  } }));
  const preview = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'prepare_market_purchase', { listingId: 10, quantity: 2 }), 'ai-plugin');
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (preview.value.ok) assert.equal((preview.value.data as any).result.reference, ref);
  confirming = true;
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'confirm_market_purchase', { reference: ref }), 'ai-plugin');
  const confirmed = await call(); assert.equal(confirmed.value.ok, true, JSON.stringify(confirmed.value));
  if (confirmed.value.ok) assert.equal((confirmed.value.data as any).result.result.totalPrice, 60);
  await call(); assert.equal(keys.at(-1), keys.at(-2));
});
