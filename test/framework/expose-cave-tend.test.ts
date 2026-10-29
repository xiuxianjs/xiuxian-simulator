import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCaveTendAllActionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_CAVE_TEND_EXPOSE=([^|]+)\|(true|false)\|(.+)/g)].map(row => ({ op: row[1], harvest: row[2] === 'true', envelope: JSON.parse(row[3]) }));
assert.equal(rows.length, 5);
test('本人和道侣打理保留实际数量、收获归属和幂等键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { harvest: current.harvest }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const companion = current.op === 'cave.companion-tend-all';
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', companion ? 'tend_companion_cave_plots' : 'tend_cave_plots', companion ? { harvest: current.harvest } : {}), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) assert.deepEqual((run.value.data as any).result, current.envelope.data.data);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
