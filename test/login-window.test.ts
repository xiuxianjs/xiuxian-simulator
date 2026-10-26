import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { createLoginReply } from '../src/response/emailSecurity/login';
import { getLoginWindowData } from '../src/response-apps/emailSecurity/login/app';

const request = { requestId: 'login-window-test', idempotencyKey: 'login-window-test-message' };

test('group /登录 never issues a credential; private replies retain leading zeroes and authoritative UID', async t => {
  mockBackendConfig(t, { api_url: 'https://login.test', robot_auth_token: 'test-token' });
  const calls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
  const payload = { playerId: 1, temporaryPassword: '08372641', expiresAt: '2026-10-01T15:00:00Z', expiresIn: 1800 };
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    return { status: 200, headers: {}, data: JSON.stringify({ data: payload }) };
  } }));
  const group = await getLoginWindowData(1, 'sender', false, request);
  assert.equal(group.code, 'ERROR');
  assert.equal(calls.length, 0);
  assert.deepEqual(await getLoginWindowData(1, 'sender', true, request), { code: 'OK', data: payload });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/players\/1\/auth\/temporary-password$/);
  assert.equal(calls[0].headers['x-bid'], 'sender');
  assert.equal(calls[0].headers.authorization, 'Bearer test-token');
  payload.playerId = 2;
  assert.equal((await getLoginWindowData(1, 'sender', true, request)).code, 'ERROR');
});


test('login reply uses a native temporary and email link buttons and contains no Markdown command button', () => {
  const reply = createLoginReply({ code: 'OK', data: {
    playerId: 1000129, email: 'bound+game@example.com', temporaryPassword: '08372641', expiresAt: '2026-10-01T15:00:00Z', expiresIn: 1800
  } }, true, 'sender');
  const data = reply.format.value;
  const buttons = data.flatMap(item => item.type === 'BT.group' ? item.value.flatMap(row => row.value) : []);
  const open = buttons.find(button => button.value === '临时进入');
  assert.ok(open);
  assert.equal(open.options?.type, 'link');
  assert.equal(open.options?.data, 'https://tatian-online.alemonjs.com/login?temporaryPassword=08372641&UID=1000129');
  const email = buttons.find(button => button.value === '邮箱进入');
  assert.equal(email?.options?.type, 'link');
  assert.equal(email?.options?.data, 'https://tatian-online.alemonjs.com/login?UID=1000129&loginMethod=email&email=bound%2Bgame%40example.com');
  assert.ok(buttons.some(button => button.options?.data === '/我'), 'original navigation stays available');
  assert.equal(JSON.stringify(data).includes('MD.button'), false);
  const errorReply = createLoginReply({ code: 'ERROR', message: '请私聊机器人发送 /登录' }, false, 'sender');
  assert.equal(JSON.stringify(errorReply.format.value).includes('temporaryPassword='), false);
});


test('missing fixed password returns a setup prompt with a native command button', async t => {
  mockBackendConfig(t, { api_url: 'https://login.test', robot_auth_token: 'test-token' });
  t.mock.method(axios, 'create', () => ({ request: async () => ({
    status: 400, headers: {}, data: JSON.stringify({ error: { code: 'PASSWORD_NOT_SET', message: '请先设置密码' } })
  }) }));
  const result = await getLoginWindowData(1, 'sender', true, request);
  assert.deepEqual(result, { code: 'PASSWORD_NOT_SET', message: '请先设置固定密码。' });
  const data = createLoginReply(result, true, 'sender').format.value;
  const buttons = data.flatMap(item => item.type === 'BT.group' ? item.value.flatMap(row => row.value) : []);
  const setup = buttons.find(button => button.value === '设置密码');
  assert.equal(setup?.options?.type, 'command');
  assert.equal(setup?.options?.data, '/设置密码 ');
  assert.equal(buttons.some(button => button.options?.type === 'link'), false);
});
