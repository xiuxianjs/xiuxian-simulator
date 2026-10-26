import { getBackendFriendRemovalAccess } from '../src/api/bot/friend-removal';
import { getBackendUnblockAccess } from '../src/api/bot/blocklist-removal';
import { getBackendBattleTemplateAccess } from '../src/api/bot/battle-templates-query';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { seedEventAccessFacts, getEventAccessFacts, invalidateEventAccessFacts, withAccessFacts, getRegisteredAccessFacts } from '../src/api/bot/access-facts';
import { getBackendFriendAccess, getBackendGuildAccess, getBackendSocialAccess } from '../src/api/bot/queries';
import { emptyRealmAccess, getBackendRealmAccess } from '../src/api/bot/realm-access-queries';

import { getBackendHomeOverview } from '../src/api/bot/player-overview';
import { requestBackend } from '../src/api/bot/client';
import type { GameEvent } from '../src/types/event';
const event = (bid = 'one'): GameEvent => ({ name: 'message.create', UserId: bid, MessageId: 'message', Platform: 'qq-bot', MessageText: '/我的好友', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;
const facts = { realm: { ...emptyRealmAccess, registered: true, canUseFifthLayerFeature: true }, social: { ok: true, realmName: '炼气五层', realmNameValue: '炼气五层', canUseSecondLayerFeature: true, canUseFifthLayerFeature: true, canUseSpar: false, canCreateOrApplyGuild: false }, alchemy: { canUse: true, needGuide: false, currentStep: null, message: '', reasonCode: 'ACCESS_OK' as const } };
test('access snapshots isolate event object, UID and BID and reject mismatched seed identities', () => {
  const e = event();
  seedEventAccessFacts(e, 'one', 1, facts);
  assert.equal(getEventAccessFacts(e, 'one', 1), facts);
  assert.equal(getEventAccessFacts(e, 'one', 2), undefined);
  assert.equal(getEventAccessFacts(e, 'two', 1), undefined);
  assert.equal(getEventAccessFacts(event(), 'one', 1), undefined);
  assert.throws(() => seedEventAccessFacts(e, 'two', 1, facts), /身份不匹配/);
  for (const uid of [0, -1, 1.5, NaN]) assert.throws(() => seedEventAccessFacts(e, 'one', uid, facts), /身份不匹配/);
  e.UserId = 'two';
  assert.equal(getEventAccessFacts(e, 'one', 1), undefined);
  e.UserId = 'one';
  invalidateEventAccessFacts(e);
  assert.equal(getEventAccessFacts(e, 'one', 1), undefined);
});
test('same event realm/social/alchemy queries reuse entry facts and UID mismatch falls back to real HTTP', async t => {
  mockBackendConfig(t, { api_url: 'https://facts.test', robot_auth_token: 'token' });
  const calls: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: { url: string }) => {
    calls.push(config.url);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { canUseFifthLayerFeature: false, realmName: '炼气一层' } }) };
  } }));
  const e = event();
  seedEventAccessFacts(e, 'one', 1, facts);
  await withEventContext(e, () => {}, async () => {
    for (let i = 0; i < 3; i++) {
      assert.equal(await getBackendSocialAccess('one', 1), facts.social);
      assert.equal(await getBackendRealmAccess('one'), facts.realm);
      
    }
    assert.equal(calls.length, 0);
    assert.deepEqual(await getBackendSocialAccess('one', 2), { ok: false, realmName: '炼气一层' });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /players\/2\/social\/access$/);
    assert.equal(getEventAccessFacts(e, 'one', 1), facts);
  });
});
test('write invalidates same-event access facts before even a failed HTTP request; GET retains facts', async t => {
  mockBackendConfig(t, { api_url: 'https://facts.test', robot_auth_token: 'token' });
  const e = event();
  let fail = false;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    assert.equal(Boolean(getEventAccessFacts(e, 'one', 1)), !fail);
    return fail ? { status: 503, headers: {}, data: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'failed' } }) }
      : { status: 200, headers: {}, data: JSON.stringify({ data: { canUseFifthLayerFeature: true, realmName: '五层' } }) };
  } }));
  await withEventContext(e, () => {}, async () => {
    seedEventAccessFacts(e, 'one', 1, facts);
    await requestBackend('one', 'get_players_id_social_access', { path: { id: 1 } });
    assert.equal(getEventAccessFacts(e, 'one', 1), facts);
    fail = true;
    await assert.rejects(requestBackend('one', 'post_players_id_flymail_mutes_targetId', { path: { id: 1, targetId: 2 }, requestId: 'write', idempotencyKey: 'write' }), /failed/);
    assert.equal(getEventAccessFacts(e, 'one', 1), undefined);
  });
});
test('access registration merges requested facts without executing or confusing importers', () => {
  let executed = 0;
  const one = withAccessFacts(['realm', 'social'], async () => { executed++; });
  const two = withAccessFacts(['realm', 'homeOverview'], async () => { executed++; });
  assert.deepEqual(getRegisteredAccessFacts([one, two, one]), ['realm', 'social', 'homeOverview']);
  assert.deepEqual(getRegisteredAccessFacts([{}]), []);
  assert.equal(executed, 0);
});

test('home carries the matching event settlement receipt once and never forwards it across UID or BID', async t => {
  mockBackendConfig(t, { api_url: 'https://facts.test', robot_auth_token: 'token' });
  const resource = { current: 0, cap: 0, regenIntervalMinutes: 1 };
  const profile = { found: false, user: null, realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access: {}, homeView: null, isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 0 };
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: { url: string; headers: Record<string, string> }) => {
    calls.push(config);
    return { status: 200, headers: {}, data: JSON.stringify({ data: { profile, notifications: [], atmosphere: null } }) };
  } }));
  const e = event();
  const receipt = 'a'.repeat(64);
  await withEventContext(e, () => {}, async () => {
    seedEventAccessFacts(e, 'one', 1, { ...facts, resourceSettlement: receipt });
    await getBackendHomeOverview('one', 1);
    assert.equal(calls[0].headers['x-command-resource-receipt'], receipt);
    assert.equal(getEventAccessFacts(e, 'one', 1), undefined);
    await getBackendHomeOverview('one', 1);
    assert.equal(calls[1].headers['x-command-resource-receipt'], undefined);
    seedEventAccessFacts(e, 'one', 1, { resourceSettlement: receipt });
    await getBackendHomeOverview('one', 2);
    assert.equal(calls[2].headers['x-command-resource-receipt'], undefined);
    assert.match(calls[2].url, /players\/2\/home-overview$/);
    seedEventAccessFacts(e, 'one', 1, { resourceSettlement: receipt });
    await getBackendHomeOverview('two', 1);
    assert.equal(calls[3].headers['x-command-resource-receipt'], undefined);
  });
  assert.equal(calls.length, 4);
});

test('every social alias reuses authoritative independent flags and keeps null versus empty names without HTTP', async t => {
  mockBackendConfig(t, { api_url: 'https://facts.test', robot_auth_token: 'token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; throw new Error('unexpected HTTP'); } }));
  const e = event();
  await withEventContext(e, () => {}, async () => {
    for (const realmNameValue of [null, '', '炼气五层']) {
      seedEventAccessFacts(e, 'one', 1, { social: { ...facts.social, realmNameValue } });
      assert.deepEqual(await getBackendFriendAccess('one', 1), [{ ok: true, realmName: '炼气五层' }, { ok: false, realmName: '炼气五层' }]);
      assert.deepEqual(await getBackendGuildAccess('one', 1), { ok: false, realmName: '炼气五层' });
      for (const alias of [getBackendFriendRemovalAccess, getBackendUnblockAccess, getBackendBattleTemplateAccess]) {
        assert.deepEqual(await alias('one', 1), { ok: true, realmName: realmNameValue ?? '未知' });
      }
    }
    assert.equal(calls, 0);
    await assert.rejects(getBackendGuildAccess('one', 2), /Network request failed/);
    assert.equal(calls, 1);
  });
});
