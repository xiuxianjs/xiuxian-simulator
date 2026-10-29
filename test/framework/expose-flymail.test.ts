import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());

test('飞信按私聊身份读取会话并拒绝群聊和不匹配的会话范围', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const calls: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/flymail.home');
    assert.deepEqual(body.arguments, { conversationId: '9', page: '2', scope: 'friend', view: 'messages' });
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    const data = { scope: 'friend', page: 2, total: 1, totalPage: 2, access: { allowed: true, realmName: '炼气', realmLevel: 2 }, muteList: [], view: 'messages', conversations: [], conversation: { id: 9, targetUid: 8, targetName: '道友' }, list: [{ kind: 'message', id: 4, scope: 'friend', senderUid: 8, senderName: '道友', content: '你好', createdAt: '2026-10-29T00:00:00Z', conversationId: 9, title: '' }] };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const invoke = (event: any, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_flymail', input), 'ai-plugin');
  const privateEvent = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const result = await invoke(privateEvent, { scope: 'friend', page: 2, conversationId: 9 });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const data = result.value.data as any;
    assert.equal(data.result.conversation.id, 9);
    assert.equal(data.result.list[0].content, '你好');
    assert.equal(data.result.list[0].createdAt, '2026-10-29T00:00:00.000Z');
  }
  const group = await invoke(app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }), { scope: 'friend' });
  assert.equal(group.value.ok, false);
  const invalid = await invoke(privateEvent, { scope: 'guild', conversationId: 9 });
  assert.equal(invalid.value.ok, false);
  assert.equal(calls.length, 1);
});

test('飞信发送、回复和屏蔽保留目标与原会话，写入重试使用原幂等键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const calls: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const operation = new URL(request.url).pathname.split('/').at(-1);
    calls.push({ operation, body, key: request.headers['idempotency-key'] });
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    const data = operation === 'flymail.mute' || operation === 'flymail.unmute' ? { outcome: 'updated', targetName: '道友', realmName: null } : { success: true, message: '已发送', targetUid: 8, conversationId: 9 };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string, input: any, ev: any = event) => app.invoke(ev, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const input = { scope: 'friend', targetUid: 8, content: '你好' };
  for (let i = 0; i < 2; i++) {
    const result = await run('send_flymail', input);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result.conversationId, 9);
    assert.deepEqual(result.messages, []);
  }
  assert.equal(calls[0].key, calls[1].key);
  assert.deepEqual(calls[0].body.arguments, { content: '你好', scope: 'friend', target: { uid: 8 } });
  const reply = await run('reply_flymail', { ...input, originConversationId: 9 });
  assert.equal(reply.value.ok, true);
  assert.equal(calls[2].operation, 'flymail.reply');
  assert.deepEqual(calls[2].body.arguments, { content: '你好', originConversationId: 9, scope: 'friend', target: { uid: 8 } });
  for (const action of ['mute_flymail', 'unmute_flymail']) {
    const result = await run(action, { targetUid: 8 });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(calls.at(-1).body.arguments, { targetBid: null, targetUid: '8' });
  }
  const before = calls.length;
  assert.equal((await run('send_flymail', { scope: 'friend', content: '你好' })).value.ok, false);
  assert.equal((await run('send_flymail', { scope: 'guild', targetUid: 8, content: '你好' })).value.ok, false);
  assert.equal((await run('send_flymail', input, app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }))).value.ok, false);
  assert.equal(calls.length, before);
});
