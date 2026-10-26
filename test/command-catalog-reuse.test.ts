import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext, logger } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { getEventCommandEntry, invalidateEventCommandEntry } from '../src/api/bot/command-entry';
import { resolveCommandTransportProfile } from '../src/router';
import { getBackendUnifiedShop } from '../src/api/bot/companion-shop-queries';
import { getBackendStorylineCatalog } from '../src/api/bot/storyline-catalog-queries';
import { getBackendUnifiedShop as shopBefore } from './fixtures/catalog-before-companion-shop-queries';
import { getBackendStorylineCatalog as storylineBefore } from './fixtures/catalog-before-storyline-catalog-queries';
import { catalogRequestFromMessage, parseShopListArgs, parseStorylineListArgs, seedEventCatalog, getEventCatalog } from '../src/api/bot/catalog-query-reuse';
import { invalidateEventAccessFacts } from '../src/api/bot/access-facts';
import { requestBackend } from '../src/api/bot/client';
import type { GameEvent } from '../src/types/event';

const normal = { identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, guide: { step: null, version: 0, expiresAt: null }, captcha: { outcome: 'not_pending', failureCount: 0, remainingAttempts: 3, passedTtlSeconds: -2, muteCount: 0, muteTtlSeconds: -2, muteUnlockTime: '' }, mute: { muted: false, claimed: false, replyCount: 0, muteTtlSeconds: -2, replyTtlSeconds: -2, muteUnlockTime: '' }, entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
const event = (text: string) => ({ name: 'message.create', UserId: 'player', MessageText: text, MessageId: 'same-message', Platform: 'qq-bot', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;
const shop = { access: { hasCompanion: false, isFoundationRealm: true, canUseReputationShop: true, visibleShopCodes: ['WANBAOLOU'], deniedReason: null }, currencies: { spiritStone: 42, spiritsCrystal: 3, spiritsMilk: 2, signInCoin: 1, towerScore: 0, reputation: 0, tongxin: 0, greenBottle: 0 }, products: [{ productId: 1, shopCode: 'WANBAOLOU', name: '材料', category: 'item', itemId: 1, priceCurrencyCode: 'SPIRIT_STONE', priceCurrencyName: '灵石', priceAmount: 2, quantity: 1, used: 0, limit: -1, remaining: -1, limitPeriod: 'NONE', limitPeriodName: '', typeLabel: '材料', secondaryPriceAmount: null, secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null, grantCurrencyCode: null, grantCurrencyName: null, requiredRealmId: null, requiredRealmName: null, requiredStars: null, unlocked: true, lockReason: null, discountPriceAmount: null, discountRate: null, discountLabel: null, itemType: null, itemSubtype: null, nextPurchaseAt: null }], page: 1, totalPages: 1, total: 1 };
const overview = { mentalValue: 15, canUseMeridian: true, canUseSecondLayerFeature: true, inTeam: false, detail: null, overview: { chapters: [{ name: '一', arc: '凡人', starsText: '3', progressText: '1/1', chestIcon: '箱', chapterNumber: 1, totalStars: 3, maxStars: 3, clearedCount: 1, stageCount: 1, claimableChestCount: 1 }], totalClaimableChests: 1, currentPage: 1, totalPages: 1, totalCount: 1, milestoneTotalStars: 3, milestoneTotal: 1, milestoneClaimed: 0, milestoneClaimable: 1, achievementLabel: '一', showClaimAllChests: true } };
const detail = { ...overview, overview: null, detail: { status: 'OK', chapterName: '一', arc: '凡人', statusMessage: '', chapterNumber: 1, totalStars: 3, maxStars: 3, canClaimChestCount: 1, maxChapterNumber: 1, eliteStagesCleared: true, showPrevChapter: false, showNextChapter: false, chests: [{ index: 1, requiredStars: 3, reward: 1, claimed: false, unlocked: true }], stages: [{ id: 1, stageNumber: 1, stageLabel: '一', monsterName: null, monsterDisplayName: '怪', rewardText: '1', starsDisplay: '3', spiritCost: 1, expReward: 1, spiritStoneReward: 1, bestStars: 3, dailyUsed: 0, dailyLimit: 3, maxSweepTimes: 3, isElite: false, canSweep: true, showBulkSweep: false, canMatch: true, drops: [{ category: 'item', amount: 1, probability: .5, itemId: 1, currencyType: null, itemName: null }] }] } };

const reply = (data: unknown, status = 200) => ({ status, headers: {}, data: JSON.stringify(status === 200 ? { data } : { error: { code: 'INVALID_ARGUMENT', message: '指令入口参数无效' } }) });

test('pure parsers preserve renderer tuple; opt-in requires exact real matched importer', () => {
  for (const text of ['/查看主线', '！主线列表 p0', '#副本列表 0', '/查看主线 p2', '/查看主线 5']) {
    assert.equal(resolveCommandTransportProfile(event(text)).catalogKind, 'storyline');
    const parsed = parseStorylineListArgs(text);
    assert.deepEqual(catalogRequestFromMessage(text, 'storyline'), { kind: 'storyline', args: { page: Math.max(1, parsed.pageArg ?? 1), chapterNumber: parsed.chapterArg } });
  }
  for (const text of ['/商店', '/商店 签到商店 0', '/商店 道侣 2 4 灵晶', '/商店 道晶', '/商店 声望商店 3']) {
    assert.equal(resolveCommandTransportProfile(event(text)).catalogKind, 'shop');
    const parsed = parseShopListArgs(text);
    assert.deepEqual(catalogRequestFromMessage(text, 'shop'), { kind: 'shop', args: { page: parsed.page, shopCode: parsed.shopCode ?? null, currencyCode: parsed.currencyCode ?? null } });
  }
  assert.deepEqual(parseShopListArgs('/商店 道侣 2 万宝楼 4 灵晶'), { page: 4, shopCode: 'DAOLV', currencyCode: 'SPIRIT_CRYSTAL' });
  assert.equal(catalogRequestFromMessage('/查看主线 99999999999999999999', 'storyline'), undefined);
  for (const text of ['/商店购买 1', '/主线扫荡 1 1', '/不存在', '/任务 /商店']) assert.equal(resolveCommandTransportProfile(event(text)).catalogKind, undefined);
});

test('actual entry header leaves original body unchanged; complete inline shop/overview/detail matches frozen getters with one HTTP', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-current.test', robot_auth_token: 'test-token' });
  for (const [text, data] of [['/商店 万宝楼', shop], ['/查看主线', overview], ['/查看主线 1', detail]] as const) {
    const e = event(text); const request = catalogRequestFromMessage(text, text.startsWith('/商店') ? 'shop' : 'storyline')!;
    let inlineEnabled = true; let calls = 0;
    t.mock.method(axios, 'create', () => ({ request: async (options: { url: string; data: string; headers: Record<string, string> }) => {
      calls++;
      if (options.url.endsWith('/command-entry')) {
        assert.equal(new Headers(options.headers).get('X-Command-Catalog'), 'v1');
        assert.equal(new Headers(options.headers).get('X-Command-Catalog-Timeout-Ms'), '10000');
        assert.deepEqual(JSON.parse(options.data), { checkMute: true, playerEntry: true, trackOperation: false, messageText: text });
        return reply({ ...normal, ...(inlineEnabled ? { catalog: { ...request, bid: 'player', playerId: 1, data } } : {}) });
      }
      return reply(data);
    } }));
    const getter = () => request.kind === 'shop' ? getBackendUnifiedShop('player', 1, 1, 'WANBAOLOU') : getBackendStorylineCatalog('player', 1, request.args.chapterNumber, request.args.page);
    const old = await (request.kind === 'shop' ? shopBefore('player', 1, 1, 'WANBAOLOU') : storylineBefore('player', 1, request.args.chapterNumber, request.args.page));
    calls = 0;
    await withEventContext(e, () => {}, async () => {
      await getEventCommandEntry(e, resolveCommandTransportProfile(e));
      assert.deepEqual(await getter(), old);
    });
    assert.equal(calls, 1);
    inlineEnabled = false; calls = 0;
    const fresh = event(text);
    await withEventContext(fresh, () => {}, async () => {
      await getEventCommandEntry(fresh, resolveCommandTransportProfile(fresh));
      assert.deepEqual(await getter(), old);
    });
    assert.equal(calls, 2); // older server ignores header; no repeated entry
    t.mock.restoreAll();
    mockBackendConfig(t, { api_url: 'https://catalog-current.test', robot_auth_token: 'test-token' });
  }
});

test('missing, wrong identity/full tuple/mode and incomplete optional DTO only fall back to original GET', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-fallback.test', robot_auth_token: 'test-token' });
  const req = { kind: 'shop', args: { page: 1, shopCode: 'WANBAOLOU', currencyCode: null } };
  const valid = { ...req, bid: 'player', playerId: 1, data: shop };
  for (const catalog of [undefined, null, {}, { ...valid, bid: 'other' }, { ...valid, playerId: 2 }, { ...valid, kind: 'storyline' }, { ...valid, args: { ...req.args, page: 2 } }, { ...valid, args: { ...req.args, currencyCode: 'SPIRIT_STONE' } }, { ...valid, args: { ...req.args, extra: 1 } }, { ...valid, data: { ...shop, currencies: {} } }, { ...valid, data: { ...shop, products: [{ ...shop.products[0], nextPurchaseAt: 'bad' }] } }]) {
    let entryCalls = 0; let getCalls = 0;
    t.mock.method(axios, 'create', () => ({ request: async (options: { url: string }) => options.url.endsWith('/command-entry') ? (entryCalls++, reply({ ...normal, catalog })) : (getCalls++, reply(shop)) }));
    const e = event('/商店 万宝楼');
    await withEventContext(e, () => {}, async () => { await getEventCommandEntry(e, resolveCommandTransportProfile(e)); assert.deepEqual(await getBackendUnifiedShop('player', 1, 1, 'WANBAOLOU'), await shopBefore('player', 1, 1, 'WANBAOLOU')); });
    assert.equal(entryCalls, 1); assert.equal(getCalls, 2); // one current fallback + frozen oracle GET
    t.mock.restoreAll(); mockBackendConfig(t, { api_url: 'https://catalog-fallback.test', robot_auth_token: 'test-token' });
  }
});

test('event identity, mutation, phase and write invalidation prevent stale or cross-event reuse', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-stale.test', robot_auth_token: 'test-token' });
  const e = event('/商店 万宝楼'); const req = catalogRequestFromMessage(e.MessageText, 'shop')!;
  const seed = () => seedEventCatalog(e, 'player', 1, req, { ...req, bid: 'player', playerId: 1, data: shop });
  seed(); assert.equal(getEventCatalog(e, 'player', 1, req), shop);
  assert.equal(getEventCatalog(event(e.MessageText), 'player', 1, req), undefined);
  assert.equal(getEventCatalog(e, 'player', 2, req), undefined);
  e.MessageId = 'changed'; assert.equal(getEventCatalog(e, 'player', 1, req), undefined);
  seed(); invalidateEventCommandEntry(e); assert.equal(getEventCatalog(e, 'player', 1, req), undefined);
  seed(); invalidateEventAccessFacts(e); assert.equal(getEventCatalog(e, 'player', 1, req), undefined);
  seed(); t.mock.method(axios, 'create', () => ({ request: async () => reply({}) }));
  await withEventContext(e, () => {}, () => requestBackend('player', 'post_players_id_entry', { path: { id: 1 }, body: { messageText: '/商店' } }));
  assert.equal(getEventCatalog(e, 'player', 1, req), undefined);
});

test('400 admission rejection with optional header never retries potentially executed entry', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-no-retry.test', robot_auth_token: 'test-token' });
  let calls = 0; t.mock.method(axios, 'create', () => ({ request: async () => { calls++; return reply(null, 400); } }));
  const e = event('/商店');
  await assert.rejects(getEventCommandEntry(e, { ...resolveCommandTransportProfile(e), accessFacts: ['resourceSettlement'] }), /指令入口参数无效/);
  assert.equal(calls, 1);
});

test('admission blockers and processing errors never seed optional catalog', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-blocked.test', robot_auth_token: 'test-token' });
  for (const blocked of [{ ...normal, entry: { ...normal.entry, processingError: 'failed' } }, { ...normal, entry: { ...normal.entry, maintenance: { disabled: true } } }, { ...normal, entry: { ...normal.entry, featureGuard: { blocked: true } } }, { ...normal, entry: { ...normal.entry, routeAllowed: false } }, { ...normal, captcha: { ...normal.captcha, outcome: 'pending' } }, { ...normal, mute: { ...normal.mute, muted: true } }, { ...normal, guide: { ...normal.guide, step: 2 } }]) {
    const e = event('/商店'); const request = catalogRequestFromMessage(e.MessageText, 'shop')!;
    let gets = 0;
    t.mock.method(axios, 'create', () => ({ request: async (options: { url: string }) => options.url.endsWith('/command-entry') ? reply({ ...blocked, catalog: { ...request, bid: 'player', playerId: 1, data: shop } }) : (gets++, reply(shop)) }));
    await withEventContext(e, () => {}, async () => { await getEventCommandEntry(e, resolveCommandTransportProfile(e)); await getBackendUnifiedShop('player', 1, 1); });
    assert.equal(gets, 1);
    t.mock.restoreAll(); mockBackendConfig(t, { api_url: 'https://catalog-blocked.test', robot_auth_token: 'test-token' });
  }
});

test('configured actual entry timeout is passed unchanged; no rounded or inflated projection budget', async t => {
  for (const timeout of [1250, 1234.5]) {
    mockBackendConfig(t, { api_url: 'https://catalog-budget.test', robot_auth_token: 'test-token', api_timeout_ms: timeout });
    t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string> }) => {
      assert.equal(new Headers(options.headers).get('X-Command-Catalog-Timeout-Ms'), String(timeout));
      return reply(normal);
    } }));
    const e = event('/查看主线'); await getEventCommandEntry(e, resolveCommandTransportProfile(e));
    t.mock.restoreAll();
  }
});

test('fallback preserves frozen getter late failure codes and sanitized messages', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-errors.test', robot_auth_token: 'test-token' });
  t.mock.method(axios, 'create', () => ({ request: async (options: { url: string }) => options.url.endsWith('/command-entry') ? reply(normal) : ({ status: 500, headers: {}, data: JSON.stringify({ error: { code: 'INTERNAL', message: 'SQL Error 1064' } }) }) }));
  const e = event('/查看主线');
  await withEventContext(e, () => {}, async () => {
    await getEventCommandEntry(e, resolveCommandTransportProfile(e));
    const error = async (read: () => Promise<unknown>) => { try { await read(); assert.fail('expected error'); } catch (value) { const failure = value as { code: string; status: number; message: string }; return { code: failure.code, status: failure.status, message: failure.message }; } };
    assert.deepEqual(await error(() => getBackendStorylineCatalog('player', 1, null, 1)), await error(() => storylineBefore('player', 1, null, 1)));
  });
});


test('new event replay uses freshly returned catalog; safe reuse diagnostics never leak args or alter requests', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-fresh-replay.test', robot_auth_token: 'PRIVATE-TOKEN', log_transport_timings: true });
  const logs: unknown[] = []; const keys: string[] = []; let counter = 0;
  t.mock.method(logger, 'info', (label: string, data: unknown) => { if (label === '[目录复用]') logs.push(data); });
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string> }) => {
    keys.push(new Headers(options.headers).get('Idempotency-Key')!); counter++;
    return reply({ ...normal, catalog: { kind: 'shop', bid: 'player', playerId: 1, args: { page: 1, shopCode: null, currencyCode: null }, data: { ...shop, currencies: { ...shop.currencies, spiritStone: counter } } } });
  } }));
  for (const expected of [1, 2]) {
    const e = event('/商店');
    await withEventContext(e, () => {}, async () => { await getEventCommandEntry(e, resolveCommandTransportProfile(e)); assert.equal((await getBackendUnifiedShop('player', 1, 1)).currencies.spiritStone, expected); });
  }
  assert.equal(counter, 2); assert.equal(keys[0], keys[1]); assert.equal(logs.length, 2);
  const first = logs[0] as Record<string, unknown>; const second = logs[1] as Record<string, unknown>;
  assert.notEqual(first.eventTraceId, second.eventTraceId);
  assert.equal(first.outcome, 'reused'); assert.equal(first.kind, 'shop');
  assert.deepEqual(Object.keys(first).sort(), ['commandKey', 'eventKind', 'eventTraceId', 'kind', 'outcome', 'requestId']);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE-TOKEN|player|商店|shopCode|currencies/);
  t.mock.method(logger, 'info', () => { throw new Error('diagnostic failure'); });
  const e = event('/商店');
  await withEventContext(e, () => {}, async () => { await getEventCommandEntry(e, resolveCommandTransportProfile(e)); assert.equal((await getBackendUnifiedShop('player', 1, 1)).currencies.spiritStone, 3); });
  assert.equal(counter, 3);
});

test('storyline optional mode, full field and nested drop validation failures retain original GET result', async t => {
  mockBackendConfig(t, { api_url: 'https://catalog-story-fallback.test', robot_auth_token: 'test-token' });
  for (const [chapter, original, invalid] of [[null, overview, detail], [null, overview, { ...overview, mentalValue: 'bad' }], [1, detail, overview], [1, detail, { ...detail, detail: { ...detail.detail, stages: [{ ...detail.detail.stages[0], drops: [{ ...detail.detail.stages[0].drops[0], itemName: 1 }] }] } }]] as const) {
    const e = event(chapter === null ? '/查看主线' : '/查看主线 1'); const request = catalogRequestFromMessage(e.MessageText, 'storyline')!; let entries = 0; let gets = 0;
    t.mock.method(axios, 'create', () => ({ request: async (options: { url: string }) => options.url.endsWith('/command-entry') ? (entries++, reply({ ...normal, catalog: { ...request, bid: 'player', playerId: 1, data: invalid } })) : (gets++, reply(original)) }));
    await withEventContext(e, () => {}, async () => { await getEventCommandEntry(e, resolveCommandTransportProfile(e)); assert.deepEqual(await getBackendStorylineCatalog('player', 1, chapter, 1), await storylineBefore('player', 1, chapter, 1)); });
    assert.equal(entries, 1); assert.equal(gets, 2);
    t.mock.restoreAll(); mockBackendConfig(t, { api_url: 'https://catalog-story-fallback.test', robot_auth_token: 'test-token' });
  }
});


test('invalid optional payload diagnostics distinguish fallback without changing GET or admission', async t => {
  for (const kind of ['shop', 'storyline'] as const) {
    for (const mode of ['invalid', 'valid', 'missing', 'logger_throw', 'disabled', 'get_error'] as const) {
      mockBackendConfig(t, { api_url: 'https://catalog-invalid-diagnostic.test', robot_auth_token: 'PRIVATE-DIAGNOSTIC-TOKEN', log_transport_timings: mode !== 'disabled' });
      const logs: Array<Record<string, unknown>> = [];
      t.mock.method(logger, 'info', (label: string, data: Record<string, unknown>) => {
        if (label === '[目录复用]') {
          if (mode === 'logger_throw') throw new Error('PRIVATE-LOGGER-ERROR');
          logs.push(data);
        }
      });
      const e = event(kind === 'shop' ? '/商店' : '/查看主线');
      const request = catalogRequestFromMessage(e.MessageText, kind)!;
      const data = kind === 'shop' ? shop : overview;
      const invalid = kind === 'shop' ? { ...shop, currencies: {} } : { ...overview, mentalValue: 'PRIVATE-BAD-PAYLOAD' };
      let entries = 0; let gets = 0;
      const requestIds: string[] = [];
      t.mock.method(axios, 'create', () => ({ request: async (options: { url: string; headers: Record<string, string> }) => {
        requestIds.push(new Headers(options.headers).get('X-Request-ID')!);
        if (options.url.endsWith('/command-entry')) {
          entries++;
          return reply({ ...normal, ...(mode === 'missing' ? {} : { catalog: { ...request, bid: 'player', playerId: 1, data: mode === 'valid' ? data : invalid } }) });
        }
        gets++;
        if (mode === 'get_error') return { status: 500, headers: {}, data: JSON.stringify({ error: { code: 'INTERNAL', message: 'PRIVATE-GET-ERROR' } }) };
        return reply(data);
      } }));
      await withEventContext(e, () => {}, async () => {
        await getEventCommandEntry(e, resolveCommandTransportProfile(e));
        const read = () => kind === 'shop' ? getBackendUnifiedShop('player', 1, 1) : getBackendStorylineCatalog('player', 1, null, 1);
        if (mode === 'get_error') {
          await assert.rejects(read, (error: { code?: string; status?: number }) => error.code === 'INTERNAL' && error.status === 500);
        } else {
          assert.ok(await read());
        }
      });
      assert.equal(entries, 1);
      assert.equal(gets, mode === 'valid' ? 0 : 1);
      assert.equal(logs.length, mode === 'invalid' || mode === 'valid' || mode === 'get_error' ? 1 : 0);
      if (logs.length) {
        const log = logs[0];
        assert.equal(log.kind, kind);
        assert.equal(log.outcome, mode === 'valid' ? 'reused' : 'fallback');
        assert.equal(log.requestId, requestIds[0]);
        assert.equal(typeof log.eventTraceId, 'string');
        assert.deepEqual(Object.keys(log).sort(), ['commandKey', 'eventKind', 'eventTraceId', 'kind', 'outcome', 'requestId', ...(mode !== 'valid' ? ['reason'] : [])].sort());
        if (mode !== 'valid') assert.equal(log.reason, 'invalid_inline_payload');
        assert.doesNotMatch(JSON.stringify(log), /PRIVATE|player|currencies|mentalValue|MessageText/);
      }
      assert.ok(requestIds.every(id => id === requestIds[0]));
      t.mock.restoreAll();
    }
  }
});
