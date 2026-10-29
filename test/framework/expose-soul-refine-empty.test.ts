import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSoulRefineEmpty$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const match = output.match(/SOUL_REFINE_EMPTY_EXPOSE=(.+)/); assert.ok(match); const original = JSON.parse(match[1]);
test('空位炼化本命物返回指定实例并复用幂等键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(original); const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/soul-artifacts.refine-empty');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { instanceId: 9 }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'refine_soul_artifact_empty_slot', { instanceId: 9 }), 'ai-plugin');
  const response = await call(); assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) assert.equal((response.value.data as any).result.artifact.id, 9);
  await call(); assert.equal(keys.at(-1), keys.at(-2));
  envelope = structuredClone(original); envelope.data.data.artifact.id = 10; assert.equal((await call()).value.ok, false);
});
