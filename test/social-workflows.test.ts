import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import Befriend from '../src/response-apps/friend/befriend/app';
import { confirmDeleteFriend } from '../src/response-apps/friend/deleteFriend/app';
import { setBackendFriendSettings } from '../src/api/bot/friend-settings';
import SetPosition, { resolvePositionTarget } from '../src/response-apps/team/setPosition/app';
import TransferLeader, { resolveTransferTarget } from '../src/response-apps/team/transferLeader/app';
import MyApplications from '../src/response-apps/team/myApplications/app';
import AcceptMaster from '../src/response-apps/master/accept/app';
import AcceptGraduation from '../src/response-apps/master/graduateAccept/app';
import RejectGraduation from '../src/response-apps/master/graduateReject/app';
import { requestFriendWorkflow } from '../src/api/bot/social-workflows';

const request = { requestId: 'social-test', idempotencyKey: 'social-test-key' };

test('nine social response paths coordinate their business facts with one HTTP request', async t => {
  mockBackendConfig(t, { api_url: 'https://social.test', robot_auth_token: 'test-only-token' });
  const calls: Array<{ url: string; data?: string }> = [];
  let response: unknown;
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    return { status: 200, headers: {}, data: JSON.stringify({ data: response }) };
  } }));
  const one = async <T>(data: unknown, execute: () => Promise<T>) => {
    response = data;
    const before = calls.length;
    const result = await execute();
    assert.equal(calls.length - before, 1);
    return result;
  };
  const base = { realmName: '五层', targetId: '2', target: { id: 2, name: '目标' } };
  assert.equal((await one({ ...base, outcome: 'result', request: { success: true, requestId: 7, targetName: '目标', fromUserName: '我', message: '好友申请已发送' } }, () => Befriend({ bid: 'one', uid: 1, selector: { targetBid: 'two' }, request })) as { code: string }).code, 'OK');
  assert.equal((await one({ ...base, outcome: 'confirmation_required' }, () => requestFriendWorkflow('one', 1, { action: 'remove', targetBid: 'two' }))).outcome, 'confirmation_required');
  const deleted = await one({ ...base, outcome: 'result', removal: { outcome: 'removed', realmName: '五层' } }, () => requestFriendWorkflow('one', 1, { action: 'remove', targetBid: 'two', confirmed: true }, request));
  const beforeRender = calls.length;
  assert.equal((await confirmDeleteFriend('one', 1, 2, request, deleted.removal)).code, 'OK');
  assert.equal(calls.length, beforeRender);
  assert.equal((await one({ canUseFifthLayerFeature: true, isEnabled: false, realmName: '五层' }, () => setBackendFriendSettings('one', 1, false, request)) as { isEnabled: boolean }).isEnabled, false);
  const mention = { findOne: async () => ({ count: 1, data: { UserId: 'two' } }) };
  const beforeResolution = calls.length;
  const positionSelector = await resolvePositionTarget('one', '@目标', mention);
  const leaderSelector = await resolveTransferTarget('one', '/转让队长 @目标', mention);
  assert.deepEqual(positionSelector, { targetBid: 'two' });
  assert.deepEqual(leaderSelector, { targetBid: 'two' });
  assert.equal(calls.length, beforeResolution);
  assert.equal((await one({ outcome: 'updated' }, () => SetPosition({ bid: 'one', uid: 1, selector: positionSelector!, position: 3, request })) as { code: string }).code, 'OK');
  assert.equal((await one({ outcome: 'transferred' }, () => TransferLeader({ bid: 'one', uid: 1, selector: leaderSelector!, request })) as { code: string }).code, 'OK');
  const leader = await one({ records: { isLeader: true, canUseSecondLayerFeature: true, realmName: '二层', applications: [] }, pending: { leaderName: '队长', applications: [{ id: 7, userId: 2, userName: '目标' }] } }, () => MyApplications({ bid: 'one', uid: 1 }));
  assert.deepEqual(leader, { code: 'LEADER', data: { leaderName: '队长', applications: [{ id: 7, userId: 2, userName: '目标' }] } });
  for (const app of [AcceptMaster, AcceptGraduation, RejectGraduation]) {
    assert.equal((await one({ message: '原业务结果' }, () => app({ bid: 'one', uid: 1, discipleArg: '2', request })) as { code: string }).code, 'OK');
    assert.match(calls.at(-1)!.url, /\/master\/proposal-decision$/);
  }
});

test('missing team mentions and locked friend requests keep original branch outcomes', async t => {
  mockBackendConfig(t, { api_url: 'https://social.test', robot_auth_token: 'test-only-token' });
  let response: unknown = { outcome: 'target_missing' };
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: response }) }) }));
  assert.equal((await SetPosition({ bid: 'one', uid: 1, selector: { targetBid: 'missing' }, position: 3, request })).code, 'TARGET_MISSING');
  assert.equal((await TransferLeader({ bid: 'one', uid: 1, selector: { targetBid: 'missing' }, request })).code, 'TARGET_MISSING');
  response = { outcome: 'locked', realmName: '四层', targetId: '', target: null };
  assert.deepEqual(await Befriend({ bid: 'one', uid: 1, selector: { targetBid: 'two' }, request }), { code: 'LOCKED', data: { realmName: '四层' } });
});
