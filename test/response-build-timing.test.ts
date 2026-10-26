import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { Format, logger, withEventContext } from 'alemonjs';
import { getDirectSend, setDirectSend } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import mainline from '../src/response/storyline/list/res';
import mainlineBefore from './fixtures/response-build-before-mainline';
import { createShopListHandler } from '../src/response/shop/handler';
import { createShopListHandler as shopBefore } from './fixtures/response-build-before-shop';
import { measureTransportStageSync, startTransportEvent } from '../src/utils/transportTiming';
import { timedMessageClient } from '../src/utils/useMessage';
import type { GameEvent } from '../src/types/event';
import { mockBackendConfig } from './backend-config-helper';

type Fact = { stage: string; outcome: string; durationMs: number; eventTraceId: string; startedFromEventStartMs: number; elapsedFromEventStartMs: number };
type Envelope = { id: string; payload: { action: string; input: { params: { format: unknown } } } };
const event = (text: string, isPrivate = false) => ({ name: 'message.create', Platform: 'qq-bot', BotId: 'synthetic-bot', UserId: 'private-player', MessageId: 'private-message', uid: 1, MessageText: text, isPrivate, Target: { scope: isPrivate ? 'user' : 'group', targetId: 'private-target' } }) as unknown as GameEvent;
const overview = () => ({ mentalValue: 40, canUseMeridian: true, canUseSecondLayerFeature: true, inTeam: false, detail: null, overview: { totalClaimableChests: 2, currentPage: 2, totalPages: 3, totalCount: 21, milestoneTotalStars: 33, milestoneTotal: 4, milestoneClaimed: 1, milestoneClaimable: 2, achievementLabel: '主线成就', showClaimAllChests: true, chapters: [{ chapterNumber: 5, name: '山门', arc: '凡人', totalStars: 9, maxStars: 12, clearedCount: 3, stageCount: 4, claimableChestCount: 2, starsText: '9/12⭐', progressText: '3/4', chestIcon: '📦' }] } });
const detail = (status = 'OK') => ({ mentalValue: 40, canUseMeridian: false, canUseSecondLayerFeature: false, inTeam: false, overview: null, detail: { status, statusMessage: '章节不可用', chapterNumber: 5, chapterName: '山门', arc: '凡人', totalStars: 9, maxStars: 12, canClaimChestCount: 2, maxChapterNumber: 9, eliteStagesCleared: true, showPrevChapter: true, showNextChapter: true, stages: [{ id: 3, stageNumber: 1, stageLabel: '5-1', monsterDisplayName: '守门人', monsterName: '守门人', rewardText: '灵石×2', starsDisplay: '三星', spiritCost: 2, expReward: 3, spiritStoneReward: 2, bestStars: 3, dailyUsed: 1, dailyLimit: 5, maxSweepTimes: 4, isElite: true, canSweep: true, showBulkSweep: true, canMatch: true, drops: [] }], chests: [{ index: 1, requiredStars: 3, reward: 2, claimed: true, unlocked: true }, { index: 2, requiredStars: 6, reward: 3, claimed: false, unlocked: true }, { index: 3, requiredStars: 12, reward: 4, claimed: false, unlocked: false }] } });
const shop = () => ({ access: { hasCompanion: true, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU', 'DAOLV'], deniedReason: null as string | null }, currencies: { spiritStone: 100, spiritsCrystal: 20, spiritsMilk: 3, signInCoin: 0, towerScore: 8, reputation: 1, tongxin: 7, greenBottle: 0 }, products: [true, false].map((unlocked, i) => ({ productId: i + 1, shopCode: 'WANBAOLOU', name: '商品', category: 'item', itemId: 3, priceAmount: 4, priceCurrencyCode: 'SPIRIT_STONE', priceCurrencyName: '灵石', limitPeriod: 'daily', limitPeriodName: '每日', typeLabel: '丹药', quantity: 2, used: 1, limit: 3, remaining: 2, secondaryPriceAmount: 1, secondaryPriceCurrencyCode: 'SPIRIT_CRYSTAL', secondaryPriceCurrencyName: '灵晶', requiredRealmId: null, requiredRealmName: null, requiredStars: null, discountRate: null, discountPriceAmount: null, discountLabel: null, grantCurrencyCode: null, grantCurrencyName: null, itemType: null, itemSubtype: null, lockReason: unlocked ? null : '境界不足', unlocked, nextPurchaseAt: null })), page: 2, totalPages: 3, total: 8 });

void test('sync timing preserves exact return and throw, records both outcomes, and diagnostic failures cannot replace them', t => {
  mockBackendConfig(t, { log_transport_timings: true });
  let now = 100;

  t.mock.method(performance, 'now', () => now);
  const facts: Fact[] = [];

  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  const e = event('/商店');

  startTransportEvent(e);
  const result = { accepted: true };

  assert.equal(measureTransportStageSync('response.build', () => {
 now += 5;

 return result;
}, e), result);
  const failure = new Error('private build failure');

  assert.throws(() => measureTransportStageSync('response.build', () => { now += 9; throw failure; }, e), err => err === failure);
  assert.deepEqual(facts.map(f => [f.outcome, f.durationMs]), [['fulfilled', 5], ['rejected', 9]]);
  t.mock.method(logger, 'info', () => { throw new Error('logger failed'); });
  assert.equal(measureTransportStageSync('response.build', () => result, e), result);
  assert.throws(() => measureTransportStageSync('response.build', () => { throw failure; }, e), err => err === failure);
  assert.doesNotMatch(JSON.stringify(facts), /private-player|private-message|private build failure/);
});

void test('real handlers preserve frozen complete format and one send; build ends before send starts and void handlers do not await it', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'private-token', log_transport_timings: true });
  let now = 100;

  t.mock.method(performance, 'now', () => now);
  const createMarkdown = Format.createMarkdown.bind(Format);

  t.mock.method(Format, 'createMarkdown', () => {
 now += 2;

 return createMarkdown();
});
  const facts: Fact[] = [];

  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  t.mock.method(logger, 'error', () => undefined);
  let data: unknown; let status = 200; let queries = 0;

  t.mock.method(axios, 'create', () => ({ request: async () => {
 await Promise.resolve();
 queries++; now += 10;

 return { status, headers: {}, data: JSON.stringify(status === 200 ? { data } : { error: { message: 'synthetic offline' } }) };
} }));
  const originalSend = getDirectSend();
  let formats: unknown[] = []; let pending: string[] = [];

  setDirectSend((raw: Envelope) => { assert.equal(raw.payload.action, 'message.send'); formats.push(structuredClone(raw.payload.input.params.format)); pending.push(raw.id); });
  t.after(() => setDirectSend(originalSend as Parameters<typeof setDirectSend>[0]));
  const run = async (handler: typeof mainline, text: string, isPrivate: boolean) => {
    facts.length = 0; formats = []; pending = []; queries = 0;
    const e = event(text, isPrivate);

    startTransportEvent(e);
    await withEventContext(e, () => {}, () => handler.current(e as never));
    assert.equal(pending.length, 1, 'one local synthetic send remains pending after handler returns');
    assert.equal(facts.filter(f => f.stage === 'platform.send').length, 0);
    for (const id of pending) {
      const resolve = actionRequestResolves.get(id);

 assert.ok(resolve);
      const timer = actionRequestTimeouts.get(id);

 if (timer) { clearTimeout(timer); }
      actionRequestTimeouts.delete(id); actionRequestResolves.delete(id);
      now += 20; resolve([{ code: 4000, message: 'synthetic failed receipt', data: null }]);
    }
    await new Promise<void>(resolve => setImmediate(resolve));

    return { formats: structuredClone(formats), queries, facts: structuredClone(facts) };
  };
  const empty = shop();

 empty.products = [];
  const denied = shop();

 denied.access.deniedReason = '入口未开放';
  const cases = [
    { old: mainlineBefore, current: mainline, text: '/查看主线 p2', data: overview(), status: 200 },
    { old: mainlineBefore, current: mainline, text: '/查看主线 5', data: detail(), status: 200 },
    { old: mainlineBefore, current: mainline, text: '/查看主线 5', data: detail('LOCKED'), status: 200 },
    { old: mainlineBefore, current: mainline, text: '/查看主线', data: {}, status: 500 },
    { old: mainlineBefore, current: mainline, text: '/查看主线 5', data: {}, status: 500 },
    ...[shop(), empty, denied].map(value => ({ old: shopBefore(), current: createShopListHandler(), text: '/商店 万宝楼 灵石 2', data: value, status: 200 })),
    { old: shopBefore(), current: createShopListHandler(), text: '/商店', data: {}, status: 500 }
  ];

  for (const entry of cases) {
    data = entry.data; status = entry.status;
    for (const isPrivate of [false, true]) {
      const before = await run(entry.old, entry.text, isPrivate);
      const after = await run(entry.current, entry.text, isPrivate);

      assert.deepEqual(after.formats, before.formats);
      assert.equal(after.queries, before.queries); assert.equal(after.queries, 1);
      const builds = after.facts.filter(f => f.stage === 'response.build');
      const sends = after.facts.filter(f => f.stage === 'platform.send');

      assert.equal(builds.length, 1); assert.equal(sends.length, 1);
      assert.ok(builds[0].durationMs > 0);
      assert.equal(builds[0].elapsedFromEventStartMs, sends[0].startedFromEventStartMs);
      assert.equal(builds[0].eventTraceId, sends[0].eventTraceId);
      assert.equal(sends[0].outcome, 'fulfilled');
      const analysis = analyzeBotTimings(after.facts.map(fact => JSON.stringify(fact)).join('\n'));

      assert.equal(analysis.samples.length, 1);
      assert.equal(analysis.samples[0].phases['response-build'].observedSpanCount, 1);
      assert.equal(analysis.samples[0].phases['response-build'].unionMs, builds[0].durationMs);
      assert.equal(analysis.samples[0].observedLastSendEndMs, sends[0].elapsedFromEventStartMs);
    }
  }
});

void test('real build exceptions retain original failure and never enter platform.send', async t => {
  mockBackendConfig(t, { api_url: 'https://synthetic.test', robot_auth_token: 'private-token', log_transport_timings: true });
  const failure = new Error('synthetic markdown failure');
  const facts: Fact[] = [];

  t.mock.method(logger, 'info', (_label: string, value: Fact) => { facts.push(value); });
  t.mock.method(Format, 'createMarkdown', () => { throw failure; });
  let data: unknown;

  t.mock.method(axios, 'create', () => ({ request: () => Promise.resolve({ status: 200, headers: {}, data: JSON.stringify({ data }) }) }));
  for (const entry of [{ old: mainlineBefore, current: mainline, text: '/查看主线', data: overview() }, { old: shopBefore(), current: createShopListHandler(), text: '/商店', data: shop() }]) {
    data = entry.data;
    for (const handler of [entry.old, entry.current]) {
      facts.length = 0;
      const e = event(entry.text);

 startTransportEvent(e);
      await assert.rejects(withEventContext(e, () => {}, () => handler.current(e as never)), err => err === failure);
      assert.equal(facts.filter(f => f.stage === 'platform.send').length, 0);
      assert.equal(facts.filter(f => f.stage === 'response.build' && f.outcome === 'rejected').length, handler === entry.current ? 1 : 0);
    }
  }
  const wrapped = timedMessageClient({ send: () => Promise.reject(failure) } as never);

  await assert.rejects(wrapped.send([]), err => err === failure);
});
