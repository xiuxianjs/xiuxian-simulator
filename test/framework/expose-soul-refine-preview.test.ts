import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestExposeSoulRefinePreview$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/SOUL_REFINE_PREVIEW=([^|]+)\|(.+)/g)].map(row => ({ state: row[1], envelope: JSON.parse(row[2]) }));
test('本命物炼化预览只查询并区分目标不存在', async t => {
  assert.equal(fixtures.length, 3);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope: any;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname; assert.equal(request.method, 'GET'); assert.equal(request.headers['x-bid'], 'player');
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: 1 } } }) };
    assert.equal(path, '/api/v1/players/1/soul-artifacts/9/equip-preview');
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const fixture of fixtures) {
    envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'preview_soul_artifact_refine', { instanceId: 9 }), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${fixture.state}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) { const result = response.value.data as any; assert.equal(result.found, fixture.state !== 'empty'); if (result.found) assert.equal(result.target.instanceId, 9); }
    if (fixture.state !== 'empty') { envelope.data.target.instanceId = 99; assert.equal((await call()).value.ok, false); }
  }
});
