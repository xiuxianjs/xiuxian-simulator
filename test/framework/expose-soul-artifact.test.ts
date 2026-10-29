import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeSoulArtifact$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_SOUL_EXPOSE=([^|]+)\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('本命物详情和培养使用服务端回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['soul-artifacts.detail', 'get_soul_artifact_detail', { instanceId: 9 }, { instanceId: '9' }, true],
    ['soul-artifacts.upgrade', 'upgrade_equipped_soul_artifact', { levels: 5 }, { levels: '5' }, false],
    ['soul-artifacts.grade-upgrade', 'promote_soul_artifact', { instanceId: 9 }, { instanceId: '9' }, false]
  ] as const) {
    op = operation; args = expected; envelope = structuredClone(fixtures.find(row => row.op === op)?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok && action === 'promote_soul_artifact') assert.equal((response.value.data as any).result.artifact.id, 9);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'get_soul_artifact_detail') {
      const item = envelope.data.data.overview.items[0];
      delete item.recoveryEffects;
      let run = await call(); assert.equal(run.value.ok, true);
      if (run.value.ok) assert.equal('recoveryEffects' in (run.value.data as any).result, false);
      item.recoveryEffects = [];
      run = await call(); assert.equal(run.value.ok, true);
      if (run.value.ok) assert.deepEqual((run.value.data as any).result.recoveryEffects, []);
    }
    if (action === 'promote_soul_artifact') { envelope.data.data.artifact.id = 10; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
});
