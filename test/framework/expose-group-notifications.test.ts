import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('群订阅操作使用真实消息上下文与服务端回执', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGroupSubscriptionV1ParityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).toString();
  const rows = [...output.matchAll(/ROBOT_GROUP_SUBSCRIPTION=(.+)/g)].map(row => JSON.parse(row[1]));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let action = 'enable'; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/notifications.group-${action}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, action === 'enable' ? '/开启群订阅' : '/关闭群订阅');
    assert.equal(typeof body.arguments.isPrivate, 'boolean');
    assert.equal(body.arguments.platform, 'qq-bot');
    assert.equal(body.arguments.targetScope, 'group');
    if (!body.arguments.isPrivate) assert.ok(body.arguments.channelId);
    const row = rows.find(row => row.action === action && (body.arguments.isPrivate ? row.arguments.isPrivate : row.result.success && row.result.branch === 'business'));
    assert.ok(row); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: row.result }) };
  } }));
  const event = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' });
  for (action of ['enable', 'disable']) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', `${action}_group_notifications`, {}), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal(typeof (result.value.data as any).result[action === 'enable' ? 'switched' : 'disabled'], 'boolean');
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
  const privateEvent = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (action of ['enable', 'disable']) {
    const run = await app.invoke(privateEvent, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', `${action}_group_notifications`, {}), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = run.value.data as any;
      assert.equal(result.result, undefined);
      assert.ok(result.replies.some((reply: any) => reply.text.includes('群内')));
    }
  }
  const before = keys.length;
  const forged = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'enable_group_notifications', { channelId: 'other' }), 'ai-plugin');
  assert.equal(forged.value.ok, false);
  assert.equal(keys.length, before);
});
