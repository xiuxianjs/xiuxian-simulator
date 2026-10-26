import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import Teach from '../src/response-apps/master/teach/app';
import Bless from '../src/response-apps/master/bless/app';

test('master interactions render returned settlement facts without extra requests', async t => {
  mockBackendConfig(t, { api_url: 'https://master-result.test', robot_auth_token: 'test-only-token' });
  let calls = 0;
  let data: Record<string, unknown> = {};
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const params = { bid: 'one', uid: 1, discipleArg: '1002179', request: { requestId: 'master-result', idempotencyKey: 'master-result-key' } };
  data = { message: '传功', rewardExperience: 30, virtueExperience: 105, virtueLevel: 2 };
  const taught = await Teach(params);
  assert.equal(taught.code, 'OK');
  assert.deepEqual(taught.data.message, ['传功成功。', '徒弟 UID：1002179', '基础修为奖励：30（实际到账受境界修为上限限制）', '当前师德：105', '师德等级：2']);
  assert.equal(calls, 1);

  data = { message: '赐福', rewardExperience: 10, virtueExperience: 108, virtueLevel: 2 };
  const blessed = await Bless(params);
  assert.equal(blessed.code, 'OK');
  assert.equal(blessed.data.message, '赐福成功。\n徒弟 UID：1002179\n基础修为奖励：10（实际到账受境界修为上限限制）\n当前师德：108\n师德等级：2');
  assert.equal(calls, 2);

  // Optional zero fields are omitted by Go; absent fields must not invent values.
  data = { message: '赐福' };
  assert.equal((await Bless(params)).data.message, '赐福成功。\n徒弟 UID：1002179');
  data = { message: '服务端完整结果\n保留原文', rewardExperience: 10 };
  assert.equal((await Bless(params)).data.message, data.message);
});
