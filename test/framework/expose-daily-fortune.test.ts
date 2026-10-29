import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestDailyFortuneRobotRouteReplayAndGroupContext$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const envelope = JSON.parse(output.match(/ROBOT_DAILY_FORTUNE_EXPOSE=(.+)/)![1]);
test('每日机缘使用真实群目标且拒绝私聊与伪造参数', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/daily-fortune.claim');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.channelId, 'official'); assert.equal(body.botId, 'bot');
    assert.deepEqual(body.arguments, { target: { platform: 'qq-bot', BotId: 'bot', scope: 'group', targetId: 'official' } });
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' });
  Object.assign(event, { BotId: 'bot', ChannelId: 'different-channel', Target: { scope: 'group', targetId: 'official', BotId: 'bot' } });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'claim_daily_fortune', input), 'ai-plugin');
  const result = await call({}); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).result.alreadyClaimed, false);
  await call({}); assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length; const invalid = await call({ target: 'other' }); assert.equal(invalid.value.ok, false); assert.equal(keys.length, before);
  const privateEvent = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const denied = await app.invoke(privateEvent, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'claim_daily_fortune', {}), 'ai-plugin');
  assert.equal(denied.value.ok, false); assert.equal(keys.length, before);
});
