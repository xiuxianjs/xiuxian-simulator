import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { writeFileSync } from 'node:fs';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import { Playwright } from '../../node_modules/jsxp/lib/core/playwright/playwright.js';
import { getDirectSend, setDirectSend } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import rights from '../../src/response/monthCard/rights/res';
import privileges from '../../src/response/monthCard/privileges/res';
import rightsBefore from './month-card-rights-before';
import privilegesBefore from './month-card-privileges-before';
import { ImageCache } from '../../src/utils/imageCdn';
import { createBackendRequestContext } from '../../src/api/bot/context';
import type { GameEvent } from '../../src/types/event';
import { mockBackendConfig } from '../backend-config-helper';

type Envelope = { id: string; payload: { action: string; input: { event: GameEvent; params: { format: unknown } } } };
type Fact = { stage?: string; requestId?: string; outcome?: string };
const WEEK = 7 * 24 * 60 * 60 * 1000;
let serial = 0;
const event = (uid: number, privateChat = false, platform = 'qq-bot', target = 'synthetic-target') => ({
  name: 'message.create', UserId: `synthetic-${uid}`, uid, MessageText: '/synthetic-panel', Platform: platform, BotId: 'synthetic-bot',
  MessageId: `synthetic-image-${++serial}`, UserAvatar: '', isPrivate: privateChat, Target: { scope: privateChat ? 'user' : 'group', targetId: target }
}) as unknown as GameEvent;
const rightsData = () => ({ name: '原名字', vipLevel: 1, totalRechargeAmount: 10000, nextVipLevel: 2, nextVipThreshold: 20000, firstRechargeTime: null,
  monthCard: { active: true, expireTime: '2030-01-01T00:00:00Z', remainingDays: 10, totalDays: 30, maxDays: 365, remainingQuota: 335,
    daily: { total: 30, claimableCount: 1, claimedCount: 2, upcomingCount: 27, calendarState: [] }, package: null },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 365, package: null },
  activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false, progressText: '测试进度', monthCardInstantRewards: ['测试奖励'], seclusionPriceText: '测试价格', seclusionRewards: [] });
const privilegesData = () => ({ found: true, name: '原名字', vipLevel: 1, totalRechargeAmount: 10000, hasMonthCard: true, pillDailyLimit: 3,
  levelEligibility: Array.from({ length: 10 }, (_, minLevel) => ({ minLevel, unlocked: minLevel <= 1, needAmount: minLevel * 10000 })),
  checkinDoubleDays: { vip2_double_days: [], vip4_double_days: [], vip6_double_days: [], vip8_double_days: [] }, canUseMeridian: true, canUseSoulPath: false,
  activeThemeConfig: null, vipPrivileges: [{ text: '测试特权', unlocked: true }], monthCardPrivileges: [{ text: '测试月卡', unlocked: true }] });

function setup(t: TestContext, data: Record<string, unknown>) {
  mockBackendConfig(t, { api_url: 'https://month-card.test', robot_auth_token: 'synthetic-token', log_transport_timings: true });
  let now = 2000000000000;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(Math, 'random', () => 0);
  t.mock.method(logger, 'error', () => {});
  const facts: Fact[] = [];
  t.mock.method(logger, 'info', (_label: string, fact: Fact) => { if (fact && typeof fact === 'object') facts.push(fact); });
  let status = 200;
  let malformed = false;
  let calls = 0;
  const headers: Headers[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: { url: string; headers: Record<string, string> }) => {
    calls++;
    headers.push(new Headers(options.headers));
    const combined = options.url.includes('/robot/business/membership.');
    if (combined) {
      const bid = new Headers(options.headers).get('X-Bid')!;
      const middleware = { outcome:'allow', reason:'ALLOWED', identity:{bid,account:{status:'registered',playerId:Number(bid.split('-').at(-1))}},
        replies:[] as unknown[], contextWarnings:[], entry:{maintenance:{disabled:false},routeAllowed:true,resourcesSettled:true,nativeComebackProcessed:false} };
      if (status !== 200) {
        middleware.replies.push({title:'',heading:'',text:status===404 && options.url.endsWith('membership.rights') ? '未找到用户信息，请稍后再试或联系运营。' : '查询失败，请稍后再试或联系运营。',buttons:[],advice:[]});
        return {status:200,headers:{},data:JSON.stringify({data:{success:false,branch:'business',middleware}})};
      }
      return {status:200,headers:{},data:JSON.stringify({data:{success:true,branch:'business',middleware,data:malformed?{}:data}})};
    }
    return { status, headers: {}, data: JSON.stringify(status === 200 ? { data: malformed ? {} : data } : { error: { code: 'SYNTHETIC_FAILURE', message: 'synthetic failure' } }) };
  } }));
  let renders = 0;
  let uploads = 0;
  let mode = 'success';
  let hold = false;
  const releases: (() => void)[] = [];
  const htmls: string[] = [];
  t.mock.method(Playwright.prototype, 'render', async (html: string) => {
    renders++;
    htmls.push(html);
    if (hold) await new Promise<void>(resolve => { releases.push(resolve); });
    if (mode === 'render-reject') throw new Error('synthetic render rejection');
    if (mode === 'render-null') return null;
    return Buffer.from('synthetic panel pixels');
  });
  // Preserve real uploadImage -> cacheImage; replace only its transport seam.
  t.mock.method(ImageCache.prototype as unknown as { uploadAppImage: () => Promise<unknown> }, 'uploadAppImage', async () => {
    uploads++;
    if (mode === 'upload-reject') throw new Error('synthetic upload rejection');
    if (mode === 'upload-null') return null;
    return { imageUrl: 'https://synthetic.test/panel.png', cdnUrl: 'https://synthetic.test/panel.png', path: 'synthetic-panel' };
  });
  const messages: { event: GameEvent; format: unknown }[] = [];
  const originalSend = getDirectSend();
  setDirectSend((raw: Envelope) => {
    assert.equal(raw.payload.action, 'message.send');
    messages.push({ event: raw.payload.input.event, format: structuredClone(raw.payload.input.params.format) });
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
  const run = async (handler: typeof rights, e: GameEvent) => {
    await withEventContext(e, () => {}, () => handler.current(e as never));
    await new Promise<void>(resolve => setImmediate(resolve));
  };
  const reset = () => { calls = 0; renders = 0; uploads = 0; messages.length = 0; facts.length = 0; htmls.length = 0; headers.length = 0; };
  return { run, reset, messages, facts, htmls, headers, stats: () => ({ calls, renders, uploads }), nextDay: () => { now += 24 * 60 * 60 * 1000; }, expire: () => { now += WEEK + 1; },
    failure: (value: string) => { mode = value; }, status: (value: number) => { status = value; }, malformed: (value: boolean) => { malformed = value; },
    hold: () => { hold = true; }, release: (reverse = false) => { hold = false; const pending = releases.splice(0); if (reverse) pending.reverse(); pending.forEach(resolve => resolve()); } };
}
async function until(check: () => boolean) {
  for (let i = 0; i < 2000; i++) {
    if (check()) return;
    await new Promise<void>(resolve => setTimeout(resolve, 1));
  }
  assert.fail('synthetic local render did not reach expected boundary');
}

// Keep the pre-cache fixtures frozen. Only the intentionally changed footer
// navigation may differ; image content and every other format node must match.
function expectedNavigation(value: unknown, name: string, canClaim: boolean): unknown {
  if (Array.isArray(value)) {
    const result: unknown[] = [];

    for (let i = 0; i < value.length; i++) {
      const node = value[i];

      if (node?.type === 'MD.button' && node.value === '[领取]' && node.options?.data === '/月卡领取') {
        if (name === 'privileges') {
          result.push({ ...node, value: '[月卡奖励]', options: { ...node.options, data: '/我的权益' } });
        } else if (canClaim) {
          result.push({ ...node, value: '[一键领取月卡]', options: { ...node.options, data: '/一键领取月卡' } });
        } else if (value[i + 1]?.type === 'MD.text' && value[i + 1]?.value === ' ') {
          i++;
        }
      } else {
        result.push(expectedNavigation(node, name, canClaim));
      }
    }

    return result;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expectedNavigation(item, name, canClaim)]));
  }

  return value;
}

function assertNavigation(value: unknown, name: string, canClaim: boolean) {
  const text = JSON.stringify(value);

  assert.doesNotMatch(text, /"data":"\/月卡领取"/);
  if (name === 'privileges') {
    assert.match(text, /"value":"\[月卡奖励\]","options":\{"data":"\/我的权益"\}/);
  } else if (canClaim) {
    assert.match(text, /"value":"\[一键领取月卡\]","options":\{"data":"\/一键领取月卡"\}/);
  } else {
    assert.doesNotMatch(text, /"data":"\/一键领取月卡"/);
  }
}

for (const [name, current, before, factory, baseUID] of [
  ['rights', rights, rightsBefore, rightsData, 4000], ['privileges', privileges, privilegesBefore, privilegesData, 5000]
] as const) {
  test(`${name}: frozen cold and concurrent bubbles, fresh API, image join, state/UID isolation and TTL`, async t => {
    const data = factory();
    const s = setup(t, data);
    const e1 = event(baseUID);
    const e2 = event(baseUID, true, 'onebot', 'synthetic-other-target');
    s.hold();
    const baseline = [s.run(before, e1), s.run(before, e2)];
    await until(() => s.stats().renders === 2);
    assert.deepEqual(s.stats(), { calls: 2, renders: 2, uploads: 0 });
    s.release();
    await Promise.all(baseline);
    const oldFormats = s.messages.map(row => row.format);
    assert.equal(s.stats().uploads, 2);
    s.expire();
    s.reset();
    s.hold();
    const shared = [s.run(current, e1), s.run(current, e2)];
    await until(() => s.stats().calls === 2 && s.stats().renders === 1);
    // Both API calls completed; only one creator remains blocked on its render.
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(s.stats(), { calls: 2, renders: 1, uploads: 0 });
    s.release();
    await Promise.all(shared);
    assert.deepEqual(s.stats(), { calls: 2, renders: 1, uploads: 1 });
    assert.deepEqual(s.messages.map(row => row.format), expectedNavigation(oldFormats, name, true));
    s.messages.forEach(row => assertNavigation(row.format, name, true));
    assert.equal(s.facts.filter(f => f.stage === 'image.cache.join').length, 1);
    for (const e of [e1, e2]) assert.equal(s.facts.filter(f => f.stage === 'platform.send' && f.requestId === createBackendRequestContext(e).requestId).length, 1);
    assert.equal(s.headers[0].get('Authorization'), 'Bearer synthetic-token');
    assert.ok(s.headers.every(header => header.get('X-Bid') === e1.UserId));
    writeFileSync(`/tmp/month-card-${name}-bubble-equivalence.json`, JSON.stringify({ before: oldFormats, after: s.messages.map(row => row.format),
      baseline: { api: 2, render: 2, upload: 2 }, optimized: { api: 2, render: 1, upload: 1 } }, null, 2) + '\n');
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 0, uploads: 0 });
    assert.equal(s.facts.filter(f => f.stage === 'image.cache.hit').length, 1);
    s.status(404);
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 0, uploads: 0 });
    assert.doesNotMatch(JSON.stringify(s.messages[0].format), /synthetic\.test\/panel\.png/);
    s.status(200);
    data.name = '新名字';
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
    if ('monthCard' in data) {
      data.monthCard.daily.claimableCount = 0;
      s.reset();
      await s.run(current, event(baseUID));
      assertNavigation(s.messages[0].format, name, false);
      data.monthCard.daily.claimableCount = 1;
      data.monthCard.active = false;
      s.reset();
      await s.run(current, event(baseUID));
      assertNavigation(s.messages[0].format, name, false);
    }
    assert.match(s.htmls[0], /新名字/);
    // Qualification must be fetched even when the old image pixels are cached.
    data.canUseSoulPath = true;
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 0, uploads: 0 });
    assert.match(JSON.stringify(s.messages[0].format), /元婴道途/);
    // Date alone does not enter the JSX. Fresh API display facts do, while
    // the original seven-day URL TTL remains valid at the next calendar day.
    s.nextDay();
    if ('monthCard' in data) {
      data.monthCard.remainingDays--;
      data.monthCard.daily.claimedCount++;
    } else {
      data.monthCardPrivileges[0].text = '新月卡显示事实';
    }
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
    s.reset();
    await s.run(current, event(baseUID + 1));
    assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
    s.reset();
    s.hold();
    data.name = '旧数据渲染中';
    const older = s.run(current, event(baseUID + 2));
    await until(() => s.stats().renders === 1);
    data.name = '新数据渲染中';
    const newer = s.run(current, event(baseUID + 2));
    await until(() => s.stats().renders === 2);
    assert.equal(s.stats().calls, 2);
    assert.match(s.htmls[0], /旧数据渲染中/);
    assert.match(s.htmls[1], /新数据渲染中/);
    // An older completion may replace the URL entry, but its fingerprint
    // must not satisfy a newer request or attach that request to the old job.
    s.release(true);
    await Promise.all([older, newer]);
    assert.equal(s.stats().uploads, 2);
    s.reset();
    await s.run(current, event(baseUID + 2));
    assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
    s.expire();
    s.reset();
    await s.run(current, event(baseUID));
    assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
  });

  test(`${name}: render/upload null or reject retains frozen bubbles; failed jobs release and API errors do not render`, async t => {
    const s = setup(t, factory());
    let uid = baseUID + 100;
    for (const failure of ['render-null', 'upload-null', 'render-reject', 'upload-reject']) {
      uid++;
      const e1 = event(uid);
      const e2 = event(uid);
      s.failure(failure);
      s.reset();
      await s.run(before, e1);
      const expected = s.messages[0].format;
      s.reset();
      s.hold();
      const pair = [s.run(current, e1), s.run(current, e2)];
      await until(() => s.stats().calls === 2 && s.stats().renders === 1);
      s.release();
      await Promise.all(pair);
      assert.equal(s.stats().renders, 1);
      assert.equal(s.stats().uploads, failure.startsWith('render-') ? 0 : 1);
      assert.deepEqual(s.messages.map(row => row.format), expectedNavigation([expected, expected], name, true));
      s.messages.forEach(row => assertNavigation(row.format, name, true));
      s.failure('success');
      s.reset();
      await s.run(current, event(uid));
      assert.deepEqual(s.stats(), { calls: 1, renders: 1, uploads: 1 });
    }
    for (const status of [404, 500]) {
      s.status(status);
      s.reset();
      await s.run(before, event(++uid));
      const expected = s.messages[0].format;
      s.reset();
      await s.run(current, event(uid));
      assert.deepEqual(s.messages[0].format, expectedNavigation(expected, name, false));
      assertNavigation(s.messages[0].format, name, false);
      assert.deepEqual(s.stats(), { calls: 1, renders: 0, uploads: 0 });
    }
    s.status(200);
    s.malformed(true);
    s.reset();
    await s.run(before, event(++uid));
    const expected = s.messages[0].format;
    s.reset();
    await s.run(current, event(uid));
    assert.deepEqual(s.messages[0].format, expectedNavigation(expected, name, false));
    assertNavigation(s.messages[0].format, name, false);
    assert.deepEqual(s.stats(), { calls: 1, renders: 0, uploads: 0 });
  });
}
