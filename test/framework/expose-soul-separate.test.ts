import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSoulSeparate$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/SOUL_SEPARATE_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ state: row[1], envelope: JSON.parse(row[2]) }));
test('零等级分离与高等级确认提示保留真实回执', async t => {
  assert.equal(fixtures.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/soul-artifacts.unequip');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { confirmed: false }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const fixture of fixtures) {
    envelope = structuredClone(fixture.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'separate_soul_artifact_if_unupgraded', {}), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${fixture.state}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) { const result = (response.value.data as any).result; assert.equal(result.mode, fixture.state === 'zero' ? 'done' : 'confirmation'); }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    envelope.data.data.result.artifact.previousLevel = fixture.state === 'zero' ? 3 : 0; assert.equal((await call()).value.ok, false);
  }
});
