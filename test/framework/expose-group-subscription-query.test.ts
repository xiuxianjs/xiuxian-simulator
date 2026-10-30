import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('查询本人群通知订阅，区分未订阅与投递受限', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessSettingsIdentityMergeAndSnapshot$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const match = output.match(/ROBOT_SETTINGS_RESPONSE=settings\.overview\|player\|(.+)/);
  assert.ok(match);
  const fixture = JSON.parse(match[1]);
  const deniedMatch = output.match(/ROBOT_SETTINGS_RESPONSE=settings\.overview\|unknown\|(.+)/);
  assert.ok(deniedMatch);
  const denied = JSON.parse(deniedMatch[1]);
  let data: any = null;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    const bid = request.headers['x-bid'];
    assert.ok(bid === 'player' || bid === 'unknown');
    assert.equal(path, '/api/v2/robot/business/settings.overview');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { includeGroup: true });
    if (bid === 'unknown') return { status: 200, headers: {}, data: JSON.stringify(denied) };
    const response = structuredClone(fixture);
    response.data.data.subscription = data;
    return { status: 200, headers: {}, data: JSON.stringify(response) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_group_notification_subscription', {}), 'ai-plugin');
  let run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.deepEqual((run.value.data as any).result, { found: false });
  data = { platform: 'qq-bot', channelId: 'group', botId: null, targetScope: 'group', isEnabled: true, failureCount: 1, lastDeliveryAt: null, lastError: null, channelState: { state: 'blocked' } };
  run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.deepEqual((run.value.data as any).result, { found: true, subscription: { platform: 'qq-bot', channelId: 'group', targetScope: 'group', isEnabled: true, failureCount: 1, channelState: { state: 'blocked' } } });
  data = {}; run = await call(); assert.equal(run.value.ok, false);
  const unregistered = app.events.privateMessage({ platform: 'qq-bot', userId: 'unknown' });
  const refusal = await app.invoke(unregistered, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_group_notification_subscription', {}), 'ai-plugin');
  assert.equal(refusal.value.ok, true, JSON.stringify(refusal.value));
  if (refusal.value.ok) {
    const result = refusal.value.data as any;
    assert.equal(result.branch, 'middleware');
    assert.equal(result.reason, 'UNREGISTERED');
    assert.equal(result.result, undefined);
  }
});
