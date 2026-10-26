import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import { receiveRepeatPresentation, consumeRepeatPresentation } from '../src/api/bot/repeat-presentation';
import { withBackendRepeatDetection } from '../src/utils/backendRepeatDetector';
import { requestBackend } from '../src/api/bot/client';
import type { GameEvent } from '../src/types/event';
const event = (): GameEvent => ({ UserId: 'one', MessageId: 'message', Platform: 'qq-bot', MessageText: '/服用 丹药', name: 'message.create' }) as GameEvent;
test('presentation receipts require exact event, identity, command and final message and are consumed once', async () => {
  const e = event();
  const repeat = { uid: 1, command: '/服用 丹药', message: '原文本', available: true, count: 3, suffix: '提示' };
  receiveRepeatPresentation(e, 'one', 1, { repeat });
  await withEventContext(event(), () => {}, async () => assert.equal(consumeRepeatPresentation('one', 1, '/服用 丹药', '原文本'), undefined));
  await withEventContext(e, () => {}, async () => {
    assert.equal(consumeRepeatPresentation('two', 1, '/服用 丹药', '原文本'), undefined);
    assert.equal(consumeRepeatPresentation('one', 2, '/服用 丹药', '原文本'), undefined);
    assert.equal(consumeRepeatPresentation('one', 1, '揉丹', '原文本'), undefined);
    assert.equal(consumeRepeatPresentation('one', 1, '/服用 丹药', '❌ 原文本'), undefined);
    assert.equal(await withBackendRepeatDetection('one', 1, '/服用 丹药', '原文本'), '原文本\n\n提示');
    assert.equal(consumeRepeatPresentation('one', 1, '/服用 丹药', '原文本'), undefined);
  });
});
test('same business HTTP transports repeat metadata; failed repeat keeps text without a second request', async t => {
  mockBackendConfig(t, { api_url: 'https://presentation.test', robot_auth_token: 'token' });
  let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    count++;
    return { status: 200, headers: {}, data: JSON.stringify({ data: { code: 'FAIL', data: { message: '原文本' } }, presentation: { repeat: { uid: 1, command: '/服用 丹药', message: '原文本', available: false } } }) };
  } }));
  await withEventContext(event(), () => {}, async () => {
    await requestBackend('one', 'post_players_id_consume', { path: { id: 1 }, body: { itemName: '丹药', quantity: 1 }, idempotencyKey: 'message' });
    assert.equal(await withBackendRepeatDetection('one', 1, '/服用 丹药', '原文本'), '原文本');
    assert.equal(count, 1);
  });
});

test('business HTTP errors carry repeat facts without turning rejection into success', async t => {
  mockBackendConfig(t, { api_url: 'https://presentation.test', robot_auth_token: 'token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    return { status: 409, headers: {}, data: JSON.stringify({ error: { code: 'CONFLICT', message: '业务拒绝' }, presentation: { repeat: { uid: 1, command: '/服用 丹药', message: '业务拒绝', available: true, count: 3, suffix: '原重复提示' } } }) };
  } }));
  await withEventContext(event(), () => {}, async () => {
    await assert.rejects(requestBackend('one', 'post_players_id_consume', { path: { id: 1 }, body: { itemName: '丹药', quantity: 1 }, idempotencyKey: 'message' }), { code: 'CONFLICT', status: 409, message: '业务拒绝' });
    assert.equal(await withBackendRepeatDetection('one', 1, '/服用 丹药', '业务拒绝'), '业务拒绝\n\n原重复提示');
    assert.equal(calls, 1);
  });
});
