import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('私聊专用能力拒绝相互矛盾的平台隐私标记', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { requests++; throw new Error('unexpected transport'); } }));
  const event = { ...app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), IsPrivate: false };
  for (const [action, input] of [
    ['get_flymail', { scope: 'friend' }],
    ['send_flymail', { scope: 'friend', targetUid: 8, content: '你好' }],
    ['get_notification_history', {}],
    ['get_pk_hiding', { assetKind: 'item' }],
    ['set_pk_hidden_quantity', { assetKind: 'item', assetId: 2, quantity: 1 }]
  ] as const) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, false, action);
    assert.equal(requests, 0, action);
  }
});
