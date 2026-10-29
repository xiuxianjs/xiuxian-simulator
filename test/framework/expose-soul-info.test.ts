import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSoulInfo$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_SOUL_INFO_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ state: row[1], envelope: JSON.parse(row[2]) }));
test('查询当前炼化本命物与持有状态', async t => {
  assert.equal(fixtures.length, 3);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/soul-artifacts.info');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const fixture of fixtures) {
    envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_equipped_soul_artifact', {}), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${fixture.state}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) { const result = (response.value.data as any).result; assert.equal(result.code, { ready: 'EQUIPPED', unrefined: 'NOT_EQUIPPED', empty: 'EMPTY' }[fixture.state]); if (fixture.state === 'ready') assert.equal(result.artifact.instanceId, 9); }
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
    if (fixture.state === 'ready') { envelope.data.data.overview.items[0].capabilities[0].instanceId = 999; assert.equal((await call()).value.ok, false); }
  }
});
