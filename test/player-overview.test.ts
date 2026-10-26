import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendHomeOverview, getBackendSettingsOverview } from '../src/api/bot/player-overview';

test('home overview makes one business request and validates missing profile without claiming atmosphere', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const resource = { current: 0, cap: 0, regenIntervalMinutes: 1 };
  const profile = { found: false, user: null, realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access: {}, homeView: null, isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 0 };
  const calls: unknown[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: unknown) => { calls.push(config); return { status: 200, headers: {}, data: JSON.stringify({ data: { profile, notifications: [], atmosphere: null } }) }; } }));
  const result = await getBackendHomeOverview('bid', 1);
  assert.equal(result.profile.found, false);
  assert.equal(result.atmosphere, null);
  assert.equal(calls.length, 1);
  assert.match(JSON.stringify(calls), /home-overview/);
});

test('settings overview obtains preferences and subscription together preserving historical values', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const calls: unknown[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: unknown) => { calls.push(config); return { status: 200, headers: {}, data: JSON.stringify({ data: { preferences: { dungeonBattleMode: 'auto', teamDungeonNoMental: false, autoApproveFriendTeam: false, hideProfile: null, confirmSpiritCrystal: 1000, confirmDaoCrystal: 'old', teamInviteEnabled: true, teamAutoAcceptInvite: 'none' }, subscription: null } }) }; } }));
  const result = await getBackendSettingsOverview('bid', 1, true);
  assert.equal(result.preferences.hideProfile, null);
  assert.equal(result.preferences.confirmDaoCrystal, 'old');
  assert.equal(result.subscription, null);
  assert.equal(calls.length, 1);
  assert.match(JSON.stringify(calls), /includeGroup/);
});

test('populated home returns settled resources, ordered badges and atmosphere in one response', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  const resource = { current: 10, cap: 100, regenIntervalMinutes: 5 };
  const access = Object.fromEntries(['canUseSecondLayerFeature', 'canUseFifthLayerFeature', 'canUseSpar', 'canUseMeridian', 'canUseProfessionAndCave', 'canUseSoulArtifact', 'canUseSoulPath', 'canAdvanceSoulArtifact', 'canJoinAlchemyGuide', 'canUseRobberyLikePvp', 'canJoinMasterAsDisciple', 'canAcceptDisciple'].map(key => [key, true]));
  const profile = { found: true, user: { id: 1, name: '测试', gender: 1, signature: '', experience: 10, qiValue: 10, mentalValue: 10, realmId: 1, createdAt: null, lastCheckInTime: null }, realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access, homeView: { realmName: '炼气', experienceText: '10', qiRecoverText: '恢复中', mentalRecoverText: '恢复中', isEarlyStarter: false }, isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 20 };
  const atmosphere = { text: '原服务端文案', kind: 'ambience' };
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { count++; return { status: 200, headers: {}, data: JSON.stringify({ data: { profile, notifications: [{ type: 'UNREAD_EMAIL', count: 2 }], atmosphere } }) }; } }));
  const result = await getBackendHomeOverview('bid', 1);
  assert.equal(count, 1);
  assert.equal(result.profile.qi.current, 10);
  assert.deepEqual(result.notifications, [{ type: 'UNREAD_EMAIL', count: 2 }]);
  assert.deepEqual(result.atmosphere, atmosphere);
});
