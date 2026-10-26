import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { getEventCommandEntry } from '../src/api/bot/command-entry';
import { getEventAccessFacts, seedEventAccessFacts } from '../src/api/bot/access-facts';
import MeHomeApp from '../src/response-apps/message/me/app';
import { validateHomeOverview } from '../src/api/bot/player-overview';
import { getBackendHomeOverview } from '../src/api/bot/player-overview';
import { resolveCommandTransportProfile } from '../src/router';
import type { GameEvent } from '../src/types/event';
import type { HomeOverviewData } from '../src/api/schemas/player-overview';

const event = (text = '/我的资料'): GameEvent => ({ name: 'message.create', UserId: 'player', MessageText: text, MessageId: 'home-message', Platform: 'qq-bot', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;
const normal = {
  identity: { bid: 'player', account: { status: 'registered', playerId: 1 } },
  guide: { step: null, version: 0, expiresAt: null },
  captcha: { outcome: 'not_pending', failureCount: 0, remainingAttempts: 3, passedTtlSeconds: -2, muteCount: 0, muteTtlSeconds: -2, muteUnlockTime: '' },
  mute: { muted: false, claimed: false, replyCount: 0, muteTtlSeconds: -2, replyTtlSeconds: -2, muteUnlockTime: '' },
  entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: true, nativeComebackProcessed: false, featureGuard: { blocked: false } }
};
const resource = { current: 10, cap: 100, regenIntervalMinutes: 5 };
const access = Object.fromEntries(['canUseSecondLayerFeature', 'canUseFifthLayerFeature', 'canUseSpar', 'canUseMeridian', 'canUseProfessionAndCave', 'canUseSoulArtifact', 'canUseSoulPath', 'canAdvanceSoulArtifact', 'canJoinAlchemyGuide', 'canUseRobberyLikePvp', 'canJoinMasterAsDisciple', 'canAcceptDisciple'].map(key => [key, true]));
const overview = {
  profile: { found: true, user: { id: 1, name: '测试', gender: 1, signature: '', experience: 10, qiValue: 10, mentalValue: 10, realmId: 1, createdAt: null, lastCheckInTime: null }, realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access, homeView: { realmName: '炼气', experienceText: '10', qiRecoverText: '恢复中', mentalRecoverText: '恢复中', isEarlyStarter: false }, isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 20 },
  notifications: [{ type: 'UNREAD_EMAIL', count: 2 }], atmosphere: { text: '原服务端文案', kind: 'ambience' }
} as HomeOverviewData;
const receipt = 'a'.repeat(64);
type Call = { url: string; data?: string; headers: Record<string, string> };
const response = (data: unknown) => ({ status: 200, headers: {}, data: JSON.stringify({ data }) });
function transport(t: TestContext, origin: string, answer: (call: Call) => object) {
  mockBackendConfig(t, { api_url: origin, robot_auth_token: 'token' });
  const calls: Call[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (call: Call) => { calls.push(call); return answer(call); } }));
  return calls;
}

test('registered profile aliases reuse complete home facts in one transport request instead of entry plus home', async t => {
  const calls = transport(t, 'https://home-facts.test', () => response({ ...normal, accessFacts: { homeOverview: overview } }));
  for (const text of ['/我的资料', '/我的信息', '/个人资料', '/我']) {
    const e = event(text);
    const profile = resolveCommandTransportProfile(e);
    assert.deepEqual(profile.accessFacts, ['resourceSettlement', 'homeOverview']);
    await withEventContext(e, () => {}, async () => {
      const result = await getEventCommandEntry(e, profile);
      assert.equal(await getEventCommandEntry(e), result);
      assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
      assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
    });
  }
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.url.endsWith('/robot/command-entry')));
});

test('old or failed optional home read retains two HTTP requests and the original authoritative resource receipt', async t => {
  const calls = transport(t, 'https://home-old-field.test', call => call.url.endsWith('/command-entry') ? response({ ...normal, accessFacts: { resourceSettlement: receipt } }) : response(overview));
  const e = event();
  await withEventContext(e, () => {}, async () => {
    await getEventCommandEntry(e, resolveCommandTransportProfile(e));
    assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
    assert.equal(getEventAccessFacts(e, 'player', 1), undefined);
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith('/players/1/home-overview'));
  assert.equal(calls[1].headers['x-command-resource-receipt'], receipt);
});

test('only exact old enum pre-execution rejection retries without home, preserving settlement and executing admission once', async t => {
  let executions = 0;
  const calls = transport(t, 'https://home-old-enum.test', call => {
    if (!call.url.endsWith('/command-entry')) return response(overview);
    const body = JSON.parse(call.data!);
    if (body.accessFacts.includes('homeOverview')) return { status: 400, headers: {}, data: JSON.stringify({ error: { code: 'INVALID_ARGUMENT', message: '指令准入事实无效' } }) };
    executions++;
    assert.deepEqual(body.accessFacts, ['resourceSettlement']);
    return response({ ...normal, accessFacts: { resourceSettlement: receipt } });
  });
  for (let i = 0; i < 2; i++) {
    const e = event();
    await withEventContext(e, () => {}, async () => {
      await getEventCommandEntry(e, resolveCommandTransportProfile(e));
      assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
    });
  }
  assert.equal(executions, 2);
  assert.equal(calls.length, 5); // First rejection+retry+home; next event entry+home.
  assert.equal(calls[0].headers['idempotency-key'], calls[1].headers['idempotency-key']);
});

test('uncertain home entry failures never repeat CAPTCHA or settlement', async t => {
  for (const [status, code, message] of [[503, 'UNAVAILABLE', 'failed'], [400, 'INVALID_ARGUMENT', '其他业务错误']] as const) {
    const calls = transport(t, `https://home-uncertain-${status}.test`, () => ({ status, headers: {}, data: JSON.stringify({ error: { code, message } }) }));
    const e = event();
    await assert.rejects(getEventCommandEntry(e, resolveCommandTransportProfile(e)), new RegExp(message));
    assert.equal(calls.length, 1);
    assert.equal(getEventAccessFacts(e, 'player', 1), undefined);
  }
});

test('malformed optional home and mismatched player snapshots fall back with unchanged complete endpoint JSON', async t => {
  for (const homeOverview of [null, { ...overview, notifications: null }, { ...overview, atmosphere: { text: null, kind: 'ambience' } }, { ...overview, profile: { ...overview.profile, user: { ...overview.profile.user!, id: 2 } } }]) {
    const calls = transport(t, 'https://home-invalid-fact.test', call => call.url.endsWith('/command-entry') ? response({ ...normal, accessFacts: { homeOverview } }) : response(overview));
    const e = event();
    await withEventContext(e, () => {}, async () => {
      await getEventCommandEntry(e, resolveCommandTransportProfile(e));
      assert.equal(getEventAccessFacts(e, 'player', 1)?.homeOverview, undefined);
      assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
    });
    assert.equal(calls.length, 2);
  }
});

test('unsolicited home, incomplete player stage and blocked admission never seed reusable home facts', async t => {
  const variants = [
    { ...normal, guide: { ...normal.guide, step: 2 } },
    { ...normal, captcha: { ...normal.captcha, outcome: 'pending' } },
    { ...normal, mute: { ...normal.mute, muted: true } },
    { ...normal, entry: { ...normal.entry, maintenance: { disabled: true } } },
    { ...normal, entry: { ...normal.entry, processingError: '结算失败' } },
    normal
  ];
  for (let i = 0; i < variants.length; i++) {
    transport(t, `https://home-blocked-${i}.test`, () => response({ ...variants[i], accessFacts: { homeOverview: overview } }));
    const e = event();
    const profile = i === variants.length - 1 ? { checkMute: true, playerEntry: false, trackOperation: false, accessFacts: ['homeOverview' as const] } : resolveCommandTransportProfile(e);
    await getEventCommandEntry(e, profile);
    assert.equal(getEventAccessFacts(e, 'player', 1)?.homeOverview, undefined);
  }
  transport(t, 'https://home-unsolicited.test', () => response({ ...normal, accessFacts: { homeOverview: overview } }));
  const e = event();
  await getEventCommandEntry(e, { checkMute: true, playerEntry: true, trackOperation: false });
  assert.equal(getEventAccessFacts(e, 'player', 1)?.homeOverview, undefined);
});

test('home snapshots remain event/UID/BID bound; platforms without message IDs use original home endpoint', async t => {
  const missing = { ...overview, profile: { ...overview.profile, found: false, user: null, access: {}, homeView: null }, atmosphere: null } as HomeOverviewData;
  const calls = transport(t, 'https://home-bound.test', () => response(missing));
  const e = event();
  seedEventAccessFacts(e, 'player', 1, { homeOverview: overview });
  await withEventContext(e, () => {}, async () => {
    assert.deepEqual(await getBackendHomeOverview('player', 1), overview);
    assert.deepEqual(await getBackendHomeOverview('player', 2), missing);
  });
  seedEventAccessFacts(e, 'player', 1, { homeOverview: overview });
  await withEventContext(e, () => {}, async () => assert.deepEqual(await getBackendHomeOverview('other', 1), missing));
  const fresh = event();
  fresh.MessageId = '';
  await withEventContext(fresh, () => {}, async () => {
    assert.equal(await getEventCommandEntry(fresh, resolveCommandTransportProfile(fresh)), null);
    assert.deepEqual(await getBackendHomeOverview('player', 1), missing);
  });
  assert.equal(calls.length, 3);
});

test('profile spirit root title reaches home unchanged and older receipts remain compatible', () => {
 const data = {...overview, profile:{...overview.profile, homeView:{...overview.profile.homeView!, spiritRootTitle:'金·中品'}}};
 const parsed = validateHomeOverview(data, 1);
 const view = MeHomeApp(parsed);
 assert.equal(view.code, 'OK');
 if (view.code === 'OK') assert.equal(view.data.stats.spiritRootTitle, '金·中品');
 assert.doesNotThrow(() => validateHomeOverview(overview, 1));
 assert.throws(() => validateHomeOverview({...data, profile:{...data.profile, homeView:{...data.profile.homeView, spiritRootTitle:42 as unknown as string}}},1), /我的资料响应不完整/);
});
