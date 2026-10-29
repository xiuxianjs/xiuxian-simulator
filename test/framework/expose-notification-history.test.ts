import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessNotificationHistoryV1ParityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixture = [...output.matchAll(/ROBOT_NOTIFICATION_HISTORY=(.+)/g)].map(row => JSON.parse(row[1])).find(row => row.state === 'ready' && row.text === '/我的通知');
assert.ok(fixture);

test('通知记录保留真实服务端分页和投递状态，群聊不得读取', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/notifications.history');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { pageText: '1' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: fixture.result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (ev: any) => app.invoke(ev, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_notification_history', {}), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const result = await run(event);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(result.messages, []);
    if (result.value.ok) assert.deepEqual((result.value.data as any).result, fixture.result.data);
  }
  assert.notEqual(keys[0], keys[1]);
  const group = await run(app.events.groupMessage({ platform: 'qq-bot', userId: 'player' }));
  assert.equal(group.value.ok, false);
  assert.equal(keys.length, 2);
});
