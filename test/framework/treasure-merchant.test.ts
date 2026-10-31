import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { TestContext } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseTreasureMerchant } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { matchesGameCommand } from '../../src/router';
import { businessEnvelope, gameFixture, type BusinessRequest } from './fixture';
import { createBackendRequestContext } from '../../src/api/bot/context';
import { businessInputFromEvent } from '../../src/api/bot/middleware-entry';

const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const operationId = 'merchant-frozen-original';
const previews: Array<{ command: string; text: string; commands: string[]; nodes: unknown[] }> = [];

function merchant(mapPrice = 10) {
  return {
    rulesVersion: 'treasure-merchant-v2-box-prices-20261031',
    poolVersion: 'treasure-36-v2',
    xianYun: 5000,
    weekStart: '2026-10-26',
    weekEnd: '2026-11-02',
    monthStart: '2026-10-01',
    monthEnd: '2026-11-01',
    products: [
      { sku: 'treasure_map', name: '藏宝图', kind: 'map', rarity: 0, unitPrice: mapPrice, period: 'weekly', limit: 10, purchased: 0, remaining: 10, maxQuantity: 10, tier: mapPrice === 10 ? 1 : 2, nextUnitPrice: mapPrice === 10 ? 15 : 20 },
      { sku: 'rare_fragment', name: '随机稀有碎片', kind: 'fragment', rarity: 4, unitPrice: 12, period: 'weekly', limit: 50, purchased: 0, remaining: 50, maxQuantity: 50 },
      { sku: 'epic_fragment', name: '随机史诗碎片', kind: 'fragment', rarity: 5, unitPrice: 25, period: 'weekly', limit: 20, purchased: 0, remaining: 20, maxQuantity: 20 },
      { sku: 'mythic_fragment', name: '随机神话碎片', kind: 'fragment', rarity: 6, unitPrice: 60, period: 'weekly', limit: 10, purchased: 0, remaining: 10, maxQuantity: 10 },
      { sku: 'rare_box', name: '稀有礼盒', kind: 'lootbox', rarity: 4, unitPrice: 160, period: 'monthly', limit: 5, purchased: 0, remaining: 5, maxQuantity: 5 },
      { sku: 'epic_box', name: '史诗礼盒', kind: 'lootbox', rarity: 5, unitPrice: 400, period: 'monthly', limit: 2, purchased: 0, remaining: 2, maxQuantity: 2 },
      { sku: 'mythic_box', name: '神话礼盒', kind: 'lootbox', rarity: 6, unitPrice: 1000, period: 'monthly', limit: 1, purchased: 0, remaining: 1, maxQuantity: 1 }
    ].map(product => ({ ...product, periodKey: product.period === 'weekly' ? '2026-10-26' : '2026-10-01', available: true, unavailableReason: '' }))
  };
}

const preview = {
  kind: 'merchant-exchange',
  operationId,
  confirmationRef,
  expiresAt: '2026-10-31T19:00:00+08:00',
  summary: ['兑换藏宝图3张，消耗30仙蕴。', '本周报价10仙蕴/张，按本次清单结算。']
};

function delivered(result: TestRunResult, command: string, expectedMessages = 1) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, expectedMessages);
  const walk = (nodes: unknown[]) => {
    for (const value of nodes) {
      if (!value || typeof value !== 'object') continue;
      const node = value as { type?: string; value?: unknown; options?: Record<string, unknown> };

      if (node.type === 'MD.button') {
        assert.equal(node.options?.autoEnter, false);
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data)].length <= 80);
      }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };

  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    walk(message.nodes);
  }
  const view = inspectMessage(result.messages.at(-1)!.nodes);

  previews.push({ command, text: view.text, commands: view.commands, nodes: result.messages.at(-1)!.nodes });

  return view;
}

after(async () => {
  const output = process.env.TREASURE_MERCHANT_PREVIEW_OUTPUT;

  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({ note: '真实 createTestApp 处理器与 Format 的离线消息节点；后端及平台投递由夹具模拟。', previews }, null, 2) + '\n');
  }
  await shutdownLogger();
});

test('秘宝商人沿用商店商品引用布局，仅展示一条藏宝图且所有兑换入口手动发送', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, merchant()));
  const command = '/上古遗珍 秘宝商人';

  assert.ok(matchesGameCommand({ name: 'private.message.create', MessageText: command }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  const view = delivered(result, command);

  assert.match(view.text, /仙蕴：5000/);
  assert.equal([...view.text.matchAll(/【\d】藏宝图 ×1/g)].length, 1);
  for (const text of ['价格：10仙蕴', '价格：12仙蕴', '价格：25仙蕴', '价格：60仙蕴', '价格：160仙蕴', '价格：400仙蕴', '价格：1,000仙蕴', '周限购50 · 剩余50', '月限购5 · 剩余5', '开启时自选一件同稀有度完整宝物']) assert.ok(view.text.includes(text), text);
  assert.equal(view.commands.filter(command => command.startsWith('/上古遗珍 兑换 ')).length, 7);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
  assert.deepEqual(requests[0].body.arguments, {});
  const topLevel = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const quotes = topLevel.filter(node => node.type === 'MD.blockquote');

  assert.ok(topLevel.some(node => node.type === 'MD.text' && node.value === '仙蕴：5000'), '余额显示在正文');
  assert.equal(quotes.length, 7, '每个商品单独一块，余额不放入引用块');
  assert.ok(quotes.every(node => JSON.stringify(node).includes('价格：')));
  for (const [index, quote] of quotes.entries()) {
    assert.ok(Array.isArray(quote.value));
    assert.equal(quote.value[0].type, 'MD.bold');
    assert.equal(quote.value[0].value, `【${index + 1}】${merchant().products[index].name} ×1`);
  }
});

test('兑换只请求原商品的新报价并进入确认，未发送确认命令不会扣仙蕴', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant() : preview));
  const command = '/上古遗珍 兑换 treasure_map 3';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /消耗30仙蕴/);
  assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.ok(view.commands.includes('/上古遗珍 秘宝商人'));
  assert.equal(requests.length, 2);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
  assert.equal(requests[1].path, '/api/v2/robot/business/treasures.preview');
  assert.deepEqual(requests[1].body.arguments, { kind: 'merchant-exchange', sku: 'treasure_map', quantity: 3, expectedUnitPrice: 10, expectedPeriodKey: '2026-10-26' });
  assert.ok(requests.every(request => !request.path.endsWith('/treasures.confirm')));
});

test('月礼盒预览携带本月周期和服务端价格，不按周重置或替换成碎片', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant() : { ...preview, summary: ['兑换神话礼盒1个，消耗1000仙蕴。'] }));
  const command = '/上古遗珍 兑换 mythic_box 1';
  const view = delivered(await app.runHandler(handler, app.events.groupMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /神话礼盒1个/);
  assert.match(view.text, /消耗1000仙蕴/);
  assert.deepEqual(requests[1].body.arguments, { kind: 'merchant-exchange', sku: 'mythic_box', quantity: 1, expectedUnitPrice: 1000, expectedPeriodKey: '2026-10-01' });
});

test('确认兑换后自动展示新价商店，重复确认沿原引用查询不生成另一笔预览', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/treasures.merchant') ? merchant(15) : { kind: 'merchant-exchange', operationId, result: { operationId, message: '兑换藏宝图10张，消耗100仙蕴。' } }));
  const command = `/确认宝物 ${confirmationRef}`;

  for (let i = 0; i < 2; i++) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const view = delivered(result, command, 2);

    assert.match(inspectMessage(result.messages[0].nodes).text, /兑换藏宝图10张/);
    assert.match(view.text, /价格：15仙蕴/);
    assert.doesNotMatch(view.text, /价格：10仙蕴/);
  }
  assert.equal(requests.length, 4);
  const confirmations = requests.filter(request => request.path.endsWith('/treasures.confirm'));

  assert.equal(confirmations.length, 2);
  assert.ok(confirmations.every(request => request.body.arguments && (request.body.arguments as Record<string, unknown>).confirmationRef === confirmationRef));
  assert.ok(requests.every(request => !request.path.endsWith('/treasures.preview')));
});

for (const args of ['treasure_map 0', 'treasure_map -1', 'treasure_map 1.5', 'treasure_map 9007199254740992', 'unknown 1', 'treasure_map 1 extra']) {
  test(`无效兑换参数不请求后端：${args}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('must not request'); });
    const command = `/上古遗珍 兑换 ${args}`;
    const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

    assert.match(view.text, /参数错误/);
    assert.equal(requests.length, 0);
  });
}

test('藏宝图数量超过当前档只显示商店，不预览跨档价格或自动补足', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, merchant()));
  const command = '/上古遗珍 兑换 treasure_map 11';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /超过当前商品可兑换份数/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/treasures.merchant');
});

test('售罄商品保留价格和剩余数量，移除兑换按钮', async t => {
  const data = merchant();
  const item = data.products.find(product => product.sku === 'mythic_box')!;

  Object.assign(item, { purchased: 1, remaining: 0, maxQuantity: 0, available: false, unavailableReason: '本月限购已用完' });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const command = '/上古遗珍 秘宝商人';
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);

  assert.match(view.text, /月限购1 · 剩余0/);
  assert.match(view.text, /本月限购已用完/);
  assert.ok(!view.commands.includes('/上古遗珍 兑换 mythic_box 1'));
});

test('商店解析拒绝重复藏宝图和不安全价格，支持最终不限购档', () => {
  assert.equal(parseTreasureMerchant(merchant()).rulesVersion, 'treasure-merchant-v2-box-prices-20261031');
  assert.equal(parseTreasureMerchant({ ...merchant(), rulesVersion: 'treasure-merchant-v1-20261031' }).rulesVersion, 'treasure-merchant-v1-20261031');
  assert.throws(() => parseTreasureMerchant({ ...merchant(), rulesVersion: 'unknown-merchant-version' }));
  const duplicate = merchant();

  duplicate.products.push(duplicate.products[0]);
  assert.throws(() => parseTreasureMerchant(duplicate));
  const unsafe = merchant();

  unsafe.products[0].unitPrice = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => parseTreasureMerchant(unsafe));
  const unlimited = merchant(50);

  Object.assign(unlimited.products[0], { limit: null, remaining: null, maxQuantity: 1000, nextUnitPrice: undefined, tier: 6 });
  const result = parseTreasureMerchant(unlimited);

  assert.equal(result.products[0].remaining, null);
  assert.equal(result.products[0].maxQuantity, 1000);
});

// Match the shared HTTP scope: the key includes the actor, while the request
// fingerprint includes both the operation path and the original body.
async function merchantReplayFixture(t: TestContext) {
  const requests: BusinessRequest[] = [];
  const ledger = new Map<string, { fingerprint: string; payload: string }>();
  const settled = new Set<string>();
  let xianYun = 5000;
  let treasureMaps = 0;
  let conflicts = 0;
  const server = createServer(async (req, res) => {
    try {
      req.setEncoding('utf8');
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const request = { path: req.url ?? '', bid: String(req.headers['x-bid'] ?? ''), idempotencyKey: String(req.headers['idempotency-key'] ?? ''), body: JSON.parse(raw || '{}') };
      requests.push(request);
      assert.ok(request.idempotencyKey, '实际请求必须携带幂等键');
      res.setHeader('Content-Type', 'application/json');
      const key = JSON.stringify([request.bid, request.idempotencyKey]);
      const fingerprint = JSON.stringify([req.method, request.path, raw]);
      const saved = ledger.get(key);
      if (saved) {
        if (saved.fingerprint !== fingerprint) {
          conflicts++;
          res.statusCode = 409;
          res.end(JSON.stringify({ error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key 已用于其他请求' } }));
        } else res.end(saved.payload);
        return;
      }
      let data: unknown;
      if (request.path.endsWith('/treasures.merchant')) data = { ...merchant(), xianYun };
      else if (request.path.endsWith('/treasures.preview')) {
        assert.equal((request.body.arguments as Record<string, unknown>).kind, 'merchant-exchange');
        data = preview;
      } else if (request.path.endsWith('/treasures.confirm')) {
        assert.equal((request.body.arguments as Record<string, unknown>).confirmationRef, confirmationRef);
        if (!settled.has(operationId)) {
          xianYun -= 30;
          treasureMaps += 3;
          settled.add(operationId);
        }
        data = { kind: 'merchant-exchange', operationId, result: { operationId, message: '兑换藏宝图3张，消耗30仙蕴。' } };
      } else throw new Error(`Unexpected merchant request ${request.path}`);
      const payload = JSON.stringify({ data: businessEnvelope(request.bid, data) });
      ledger.set(key, { fingerprint, payload });
      res.end(payload);
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: { code: 'FIXTURE_FAILED', message: '模拟请求处理失败' } }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const app = createTestApp({ config: {
    processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' },
    'xiuxian-game': { backend: { api_url: url, robot_auth_token: 'offline-fixture-token' } }
  } });
  t.after(async () => {
    try { await app.dispose(); } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
  return { app, requests, url, state: () => ({ xianYun, treasureMaps, settled: settled.size, conflicts, ledger: ledger.size }) };
}

for (const isPrivate of [true, false]) {
  test(`商人查询与兑换预览独立幂等，整条消息重投稳定 private=${isPrivate}`, async t => {
    const { app, requests, state } = await merchantReplayFixture(t);
    const command = '/上古遗珍 兑换 treasure_map 3';
    const options = { text: command, platform: 'qq-bot', messageId: 'merchant-exchange-original' };
    const event = isPrivate ? app.events.privateMessage(options) : app.events.groupMessage(options);
    for (let i = 0; i < 2; i++) {
      const view = delivered(await app.runHandler(handler, event), command);
      assert.match(view.text, /消耗30仙蕴/);
      assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
      assert.doesNotMatch(view.text, /Idempotency-Key/);
    }
    assert.deepEqual(requests.map(request => request.path.split('/').at(-1)), ['treasures.merchant', 'treasures.preview', 'treasures.merchant', 'treasures.preview']);
    assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
    assert.equal(requests[0].idempotencyKey, createBackendRequestContext(event).idempotencyKey, '商店读取保留旧事件键');
    assert.equal(requests[1].idempotencyKey, createBackendRequestContext(event, 'treasures.preview').idempotencyKey);
    assert.deepEqual(requests.slice(2).map(request => request.idempotencyKey), requests.slice(0, 2).map(request => request.idempotencyKey));
    assert.deepEqual(state(), { xianYun: 5000, treasureMaps: 0, settled: 0, conflicts: 0, ledger: 2 });
  });

  test(`确认与商店刷新独立幂等，原引用换消息确认只到账一次 private=${isPrivate}`, async t => {
    const { app, requests, state } = await merchantReplayFixture(t);
    const command = `/确认宝物 ${confirmationRef}`;
    const options = { text: command, platform: 'qq-bot', messageId: 'merchant-confirm-original' };
    const event = isPrivate ? app.events.privateMessage(options) : app.events.groupMessage(options);
    const nextOptions = { ...options, messageId: 'merchant-confirm-retry-new-message' };
    const retry = isPrivate ? app.events.privateMessage(nextOptions) : app.events.groupMessage(nextOptions);
    for (const input of [event, event, retry]) {
      const result = await app.runHandler(handler, input);
      const view = delivered(result, command, 2);
      assert.match(inspectMessage(result.messages[0].nodes).text, /兑换藏宝图3张/);
      assert.match(view.text, /仙蕴：4970/);
      assert.doesNotMatch(view.text, /Idempotency-Key/);
    }
    assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
    assert.equal(requests[0].idempotencyKey, createBackendRequestContext(event).idempotencyKey, '确认写操作仍保留原事件键');
    assert.deepEqual(requests.slice(2, 4).map(request => request.idempotencyKey), requests.slice(0, 2).map(request => request.idempotencyKey));
    assert.notEqual(requests[4].idempotencyKey, requests[0].idempotencyKey);
    assert.ok(requests.filter(request => request.path.endsWith('/treasures.confirm')).every(request => (request.body.arguments as Record<string, unknown>).confirmationRef === confirmationRef));
    assert.deepEqual(state(), { xianYun: 4970, treasureMaps: 3, settled: 1, conflicts: 0, ledger: 4 });
  });
}

test('已缓存商店读取的旧失败消息可用原MessageId重新进入兑换预览', async t => {
  const { app, requests, url, state } = await merchantReplayFixture(t);
  const command = '/上古遗珍 兑换 treasure_map 3';
  const event = app.events.privateMessage({ text: command, platform: 'qq-bot', messageId: 'merchant-before-upgrade-failed' });
  const context = createBackendRequestContext(event);
  const response = await fetch(url + '/api/v2/robot/business/treasures.merchant', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bid': event.UserId, 'Idempotency-Key': context.idempotencyKey! },
    body: JSON.stringify({ ...businessInputFromEvent(event), arguments: {} })
  });
  assert.equal(response.status, 200);
  await response.json();
  const view = delivered(await app.runHandler(handler, event), command);
  assert.match(view.text, /消耗30仙蕴/);
  assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.equal(requests[1].idempotencyKey, requests[0].idempotencyKey, '复用已缓存的原读取回执');
  assert.notEqual(requests[2].idempotencyKey, requests[0].idempotencyKey);
  assert.deepEqual(state(), { xianYun: 5000, treasureMaps: 0, settled: 0, conflicts: 0, ledger: 2 });
});

test('同一幂等键更换同业务参数仍返回409，不放宽重复请求保护', async t => {
  const { app, requests, url, state } = await merchantReplayFixture(t);
  await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 秘宝商人', platform: 'qq-bot' }));
  const original = requests[0];
  const response = await fetch(url + original.path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bid': original.bid, 'Idempotency-Key': original.idempotencyKey },
    body: JSON.stringify({ ...original.body, arguments: { quantity: 2 } })
  });
  assert.equal(response.status, 409);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, 'IDEMPOTENCY_KEY_REUSED');
  assert.equal(state().conflicts, 1);
  assert.equal(state().settled, 0);
});

for (const [command, kind] of [['/宝物 升级 401', 'upgrade'], ['/上古遗珍 免费探索', 'explore']] as const) {
  test(`其他宝物预览保留原事件幂等键：${kind}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...preview, kind, summary: ['按本次预览确认操作。'] }));
    const event = app.events.privateMessage({ text: command, platform: 'qq-bot' });
    delivered(await app.runHandler(handler, event), command);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].idempotencyKey, createBackendRequestContext(event).idempotencyKey);
    assert.equal((requests[0].body.arguments as Record<string, unknown>).kind, kind);
  });
}
