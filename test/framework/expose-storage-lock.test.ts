import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeStorageLock$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_STORAGE_LOCK_EXPOSE=([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(row => ({ op: row[1], category: row[2], id: Number(row[3]), envelope: JSON.parse(row[4]) }));
test('背包实例锁定和解锁使用真实服务端回执及幂等键', async t => {
  assert.equal(fixtures.length, 12);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let fixture = fixtures[0]; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/storage.${fixture.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { args: [fixture.category, String(fixture.id)] }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (const row of fixtures) {
    fixture = row; envelope = structuredClone(row.envelope);
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const action = row.op === 'lock' ? 'lock_storage_instance' : 'unlock_storage_instance';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { category: row.category, instanceId: row.id }), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action} ${row.category}: ${JSON.stringify(response.value)}`);
    if (response.value.ok) { assert.equal((response.value.data as any).result.category, row.category); assert.equal((response.value.data as any).result.instanceId, row.id); }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    envelope.data.data.itemId = row.id + 1; assert.equal((await call()).value.ok, false);
  }
});
