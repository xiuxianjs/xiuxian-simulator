import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import { getDirectSend, setDirectSend } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import response from '../src/response/market/list/res';
import before from './fixtures/market-guide-before';
import { getBackendMarketGuideBalance } from '../src/api/bot/market-guide-balance';
import { createBackendRequestContext } from '../src/api/bot/context';
import type { GameEvent } from '../src/types/event';
import { mockBackendConfig } from './backend-config-helper';

type Call = { url: string; headers: Record<string, string> };
type Envelope = { id: string; payload: { action: string; input: { params: { format: unknown } } } };
const event = (text: string, uid: unknown = 1, bid = 'synthetic-one', isPrivate = false) => ({ name: 'message.create', UserId: bid, uid, MessageText: text,
  Platform: 'qq-bot', BotId: 'synthetic-bot', MessageId: 'synthetic-guide', isPrivate, Target: { scope: isPrivate ? 'user' : 'group', targetId: 'synthetic-target' } }) as unknown as GameEvent;
const browse = (balance: unknown) => ({ spiritsCrystal: balance, quota: { dailyLimit: 500, dailyUsed: 0, remaining: 500 }, items: [], pagination: { currentPage: 1, totalPages: 1, total: 0 } });

test('actual guide handler preserves complete frozen bubbles and makes only the existing currencies request', async t => {
  mockBackendConfig(t, { api_url: 'https://guide.test', robot_auth_token: 'synthetic-token' });
  t.mock.method(logger, 'error', () => {});
  let balance: unknown = 88;
  let status = 200;
  let networkError = false;
  let marketError = false;
  const calls: Call[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: Call) => {
    calls.push(options);
    if (networkError) throw new Error('synthetic offline');
    const isMarket = options.url.includes('/market/browse');
    const resultStatus = isMarket && marketError ? 500 : status;
    return { status: resultStatus, headers: {}, data: JSON.stringify(resultStatus === 200
      ? { data: isMarket ? browse(balance) : { SPIRIT_CRYSTAL: balance } }
      : { error: { code: 'SYNTHETIC_FAILURE', message: 'synthetic failure' } }) };
  } }));
  const originalSend = getDirectSend();
  let formats: unknown[] = [];
  setDirectSend((raw: Envelope) => {
    assert.equal(raw.payload.action, 'message.send');
    formats.push(structuredClone(raw.payload.input.params.format));
    // Resolve only the local synthetic SDK transport; never open QQ/IPC/WebSocket.
    setImmediate(() => {
      const resolve = actionRequestResolves.get(raw.id);
      const timer = actionRequestTimeouts.get(raw.id);
      if (timer) clearTimeout(timer);
      actionRequestTimeouts.delete(raw.id);
      actionRequestResolves.delete(raw.id);
      assert.ok(resolve);
      resolve([{ code: 2000, message: 'synthetic local receipt', data: null }]);
    });
  });
  t.after(() => setDirectSend(originalSend as Parameters<typeof setDirectSend>[0]));
  const run = async (handler: typeof response, e: GameEvent) => {
    calls.length = 0;
    formats = [];
    await withEventContext(e, () => {}, () => handler.current(e as never));
    await new Promise<void>(resolve => setImmediate(resolve));
    return { calls: [...calls], formats: structuredClone(formats) };
  };
  const fixture: unknown[] = [];
  for (const text of ['/珍宝楼 搜索', '/珍宝楼 筛选', '/珍宝楼 筛选 无此分类', '/珍宝楼 不合法参数']) {
    for (const privateChat of [false, true]) {
      for (const amount of [0, 88, -2, 123456789]) {
        balance = amount;
        const e = event(text, 1, 'synthetic-one', privateChat);
        const old = await run(before, e);
        const current = await run(response, e);
        assert.deepEqual(current.formats, old.formats, `${text}: full bubble`);
        assert.equal(current.formats.length, 1);
        assert.equal(old.calls.length, 1);
        assert.match(old.calls[0].url, /\/players\/1\/market\/browse/);
        assert.equal(current.calls.length, 1);
        assert.match(current.calls[0].url, /\/players\/1\/currencies$/);
        const headers = new Headers(current.calls[0].headers);
        assert.equal(headers.get('Authorization'), 'Bearer synthetic-token');
        assert.equal(headers.get('X-Bid'), e.UserId);
        assert.equal(headers.get('X-Request-ID'), createBackendRequestContext(e).requestId);
        if (text === '/珍宝楼 搜索' && amount === 88) fixture.push({ privateChat, before: old.formats, after: current.formats });
      }
    }
  }
  for (const amount of [undefined, null, '88', {}, [], true]) {
    balance = amount;
    assert.deepEqual((await run(response, event('/珍宝楼 搜索'))).formats, (await run(before, event('/珍宝楼 搜索'))).formats);
  }
  balance = 88;
  for (const failure of [401, 403, 404, 500]) {
    status = failure;
    const old = await run(before, event('/珍宝楼 筛选'));
    const current = await run(response, event('/珍宝楼 筛选'));
    assert.deepEqual(current.formats, old.formats);
    assert.equal(current.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(current.formats), /灵晶：/);
  }
  status = 200;
  networkError = true;
  assert.deepEqual((await run(response, event('/珍宝楼 搜索'))).formats, (await run(before, event('/珍宝楼 搜索'))).formats);
  networkError = false;
  for (const uid of [undefined, null, 0, '1']) {
    const noUID = Object.assign(event('/珍宝楼 搜索'), { uid });
    const current = await run(response, noUID);
    const old = await run(before, noUID);
    assert.deepEqual(current.formats, old.formats);
    assert.equal(current.calls.length, 0);
  }
  const missingBid = event('/珍宝楼 搜索', 1, '');
  const missingBidCurrent = await run(response, missingBid);
  assert.deepEqual(missingBidCurrent.formats, (await run(before, missingBid)).formats);
  assert.equal(missingBidCurrent.calls.length, 0);
  // A failed unused market dependency no longer suppresses a valid live balance.
  marketError = true;
  const oldFailure = await run(before, event('/珍宝楼 搜索'));
  const isolated = await run(response, event('/珍宝楼 搜索'));
  assert.doesNotMatch(JSON.stringify(oldFailure.formats), /灵晶：/);
  assert.match(JSON.stringify(isolated.formats), /灵晶：88/);
  marketError = false;
  for (const text of ['/珍宝楼 搜索 培元丹', '/珍宝楼 筛选 道具 丹药', '/珍宝楼 1']) {
    const current = await run(response, event(text));
    const old = await run(before, event(text));
    assert.deepEqual(current.formats, old.formats);
    assert.equal(current.calls.length, 1);
    assert.match(current.calls[0].url, /\/market\/browse/);
  }
  const first = await run(response, event('/珍宝楼 搜索', 1, 'synthetic-one'));
  balance = 19;
  const fresh = await run(response, event('/珍宝楼 搜索', 2, 'synthetic-two'));
  assert.match(fresh.calls[0].url, /\/players\/2\/currencies$/);
  assert.equal(new Headers(fresh.calls[0].headers).get('X-Bid'), 'synthetic-two');
  assert.match(JSON.stringify(first.formats), /灵晶：88/);
  assert.match(JSON.stringify(fresh.formats), /灵晶：19/);
  assert.notEqual(new Headers(first.calls[0].headers).get('X-Request-ID'), new Headers(fresh.calls[0].headers).get('X-Request-ID'));
  balance = 20;
  const sameActorFresh = await run(response, event('/珍宝楼 搜索', 2, 'synthetic-two'));
  assert.equal(sameActorFresh.calls.length, 1);
  assert.match(JSON.stringify(sameActorFresh.formats), /灵晶：20/);
  writeFileSync('/tmp/market-guide-bubble-equivalence.json', JSON.stringify(fixture, null, 2) + '\n');
});

test('guide balance requires identity and a finite actual currency value; no missing balance becomes zero', async t => {
  mockBackendConfig(t, { api_url: 'https://guide-validation.test', robot_auth_token: 'synthetic-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; return { status: 200, headers: {}, data: '{"data":{}}' }; } }));
  await assert.rejects(getBackendMarketGuideBalance(undefined, 1), /平台身份/);
  assert.equal(calls, 0);
  await assert.rejects(getBackendMarketGuideBalance('synthetic-one', 1), /货币余额响应不完整/);
  assert.equal(calls, 1);
});
