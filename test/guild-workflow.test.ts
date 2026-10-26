import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import ResignationOptions from '../src/response-apps/guild/resignRole/query';
import AddEssence from '../src/response-apps/guild/addEssence/app';
import ViewEssences from '../src/response-apps/guild/viewEssences/app';
import SetMinRealm from '../src/response-apps/guild/setMinRealm/app';
import ResignRole from '../src/response-apps/guild/resignRole/app';
import AppointRole from '../src/response-apps/guild/appointRole/app';
import AutoRefresh from '../src/response-apps/guild/autoRefreshShop/app';
import ClaimStoryline from '../src/response-apps/guild/storyline/claim/app';
import RefreshShop from '../src/response-apps/guild/refresh/app';
import Shop from '../src/response-apps/guild/shop/app';

const request = { requestId: 'guild-test', idempotencyKey: 'guild-test-key' };

test('guild capabilities use one business HTTP request including lookups and refreshed pages', async t => {
  mockBackendConfig(t, { api_url: 'https://guild.test', robot_auth_token: 'test-only-token' });
  const calls: { url: string; data?: string; headers: Record<string, string> }[] = [];
  let response: unknown;
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    return { status: 200, headers: {}, data: JSON.stringify({ data: response }) };
  } }));
  const one = async (data: unknown, execute: () => Promise<unknown>) => {
    response = data;
    const before = calls.length;
    const result = await execute();
    assert.equal(calls.length - before, 1);
    assert.match(calls.at(-1)!.url, /\/players\/1\/guild\/workflow$/);
    return result;
  };
  const directory = await one({ membershipStatus: 'not_joined', operatorUserId: null, operatorRoleName: null, isDeputy: false, members: [] }, () => ResignationOptions({ bid: 'one', uid: 1 }));
  assert.equal((directory as { code: string }).code, 'FAIL');
  assert.deepEqual(await one({ outcome: 'added', id: 1 }, () => AddEssence({ bid: 'one', uid: 1, content: '精华', request })), { code: 'OK', data: { message: '宗门精华添加成功' } });
  const essences = await one({ hasMembership: true, guildName: '宗门', items: [], page: 1, total: 0, totalPages: 0 }, () => ViewEssences({ bid: 'one', uid: 1, page: 99, request }));
  assert.equal((essences as { code: string }).code, 'OK');
  assert.equal((await one({ outcome: 'updated', minRealmId: 2, realmName: '筑基', matchedRealmName: '筑基' }, () => SetMinRealm({ bid: 'one', uid: 1, searchTerm: '筑', request })) as { code: string }).code, 'OK');
  const role = { outcome: 'appointed', message: '任命成功', guildId: 1, guildName: '宗门', confirmationRequired: false };
  assert.equal((await one(role, () => AppointRole({ bid: 'one', uid: 1, roleName: '长老', targetUid: 2, request })) as { code: string }).code, 'OK');
  assert.equal((await one(role, () => AppointRole({ bid: 'one', uid: 1, roleName: '长老', targetUid: null,
    targetBid: 'mentioned', request })) as { code: string }).code, 'OK');
  assert.equal((await one({ kind: 'demote', result: role }, () => ResignRole({ bid: 'one', uid: 1,
    targetUid: null, targetBid: 'mentioned', request })) as { code: string }).code, 'DEMOTE_DONE');
  const confirm = { ...role, outcome: 'confirmation_required', confirmationRequired: true };
  assert.equal((await one({ kind: 'resign', result: confirm }, () => ResignRole({ bid: 'one', uid: 1,
    targetUid: null, targetBid: 'one', request })) as { code: string }).code, 'RESIGN_CONFIRM');
  const help = await one({ outcome: 'target_missing', roles: [{ id: 1, name: '长老' }] },
    () => AppointRole({ bid: 'one', uid: 1, roleName: '长老', targetUid: null, targetBid: 'unregistered' }));
  assert.equal((help as { code: string }).code, 'NO_MATCH');
  assert.equal((await one({ kind: 'options', options: { membershipStatus: 'not_joined', operatorUserId: null,
    operatorRoleName: null, isDeputy: false, members: [] } }, () => ResignRole({ bid: 'one', uid: 1,
    targetUid: null, targetBid: 'unregistered' })) as { code: string }).code, 'FAIL');
  assert.equal((await one({ outcome: 'updated', enabled: true, hours: [8], version: '', isLeader: true, isViceLeader: false }, () => AutoRefresh({ bid: 'one', uid: 1, param: '8', request })) as { code: string }).code, 'OK');
  assert.deepEqual(await one({ stageIndex: 4, spiritCrystal: 34 }, () => ClaimStoryline({ bid: 'one', uid: 1, request })), { code: 'OK', data: { message: '奖励领取成功，获得灵晶34', stageIndex: 4, spiritCrystal: 34 } });
  const page = { items: [], contributionPoints: 8, autoRefreshEnabled: false, autoRefreshHours: [], autoRefreshStatusText: '未开启', refreshDailyLimit: 1, isLeader: true };
  const refresh = await one({ receipt: { guildId: 1, cost: 10, remaining: 0, itemCount: 0 }, page }, () => RefreshShop({ bid: 'one', uid: 1, request }));
  const beforePage = calls.length;
  const result = await Shop({ bid: 'one', uid: 1, page: (refresh as { data: { page: typeof page } }).data.page });
  assert.equal(result.code, 'OK');
  assert.equal(calls.length, beforePage);
});

test('refresh success with page failure keeps the receipt and cannot trigger a second request', async t => {
  mockBackendConfig(t, { api_url: 'https://guild.test', robot_auth_token: 'test-only-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    return { status: 200, headers: {}, data: JSON.stringify({ data: { receipt: { guildId: 1, cost: 10, remaining: 0, itemCount: 0 }, pageError: '页面读取失败' } }) };
  } }));
  const refresh = await RefreshShop({ bid: 'one', uid: 1, request });
  assert.equal(refresh.code, 'OK');
  if (refresh.code !== 'OK') { throw new Error('missing receipt'); }
  assert.equal((await Shop({ bid: 'one', uid: 1, pageError: refresh.data.pageError })).code, 'LOAD_FAILED');
  assert.equal(calls, 1);
});
