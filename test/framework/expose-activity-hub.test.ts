import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessActivityHubCatalogVisibilityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_ACTIVITY_HUB_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ scenario: row[1], envelope: JSON.parse(row[2]) }));
assert.ok(fixtures.length > 1);

for (const fixture of fixtures) test(`活动状态：${fixture.scenario}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/activity.hub');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/个人活动');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_activity_hub', {}), 'ai-plugin');
  const result = await call();
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const response = result.value.data as any;
    assert.equal(response.success, fixture.envelope.data.success);
    if (response.success && response.branch === 'business') {
      assert.equal(response.result.limitedEvent.activeCount, fixture.envelope.data.data.limitedEvent.activeCount);
      assert.equal(response.result.overseasIsland, fixture.envelope.data.data.overseasIsland);
      assert.equal(response.result.guildSecretRealmWar.phase, fixture.envelope.data.data.guildSecretRealmWar.phase);
    } else {
      assert.equal(response.result, undefined);
      assert.deepEqual(response.replies, fixture.envelope.data.middleware.replies);
    }
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
});
