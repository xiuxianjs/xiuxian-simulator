import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSoulWashReference$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/SOUL_WASH_REFERENCE=([^|]+)\|(.+)/g)].map(row => ({ key: row[1], envelope: JSON.parse(row[2]) }));
test('洗涤生成及原结果确认和取消', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const preview = fixtures.find(row => row.key === 'preview'); assert.ok(preview);
  let operation = 'soul-artifacts.wash-prepare-reference'; let envelope = structuredClone(preview.envelope); let args: any = {};
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data; assert.deepEqual(body.arguments, args);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const prepared = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'prepare_soul_artifact_wash', {}), 'ai-plugin');
  assert.equal(prepared.value.ok, true, JSON.stringify(prepared.value)); if (!prepared.value.ok) return;
  const quote = (prepared.value.data as any).result; assert.equal(quote.pending.instanceId, 9); assert.equal(quote.pending.totalSuccess, 1);
  operation = 'soul-artifacts.wash-decide-reference';
  for (const mode of ['confirm', 'cancel']) {
    const fixture = fixtures.find(row => row.key === mode); assert.ok(fixture); envelope = structuredClone(fixture.envelope); args = { reference: quote.reference, mode };
    const response = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', `${mode}_soul_artifact_wash`, { reference: quote.reference }), 'ai-plugin');
    assert.equal(response.value.ok, true, JSON.stringify(response.value)); if (response.value.ok) assert.equal((response.value.data as any).result.mode, mode);
  }
});
