import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
// The Go fixture also asserts identical replay receipts and one reward grant.
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCheckInSettlementPartialAndReplay$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/ROBOT_CHECKIN_RESPONSE=checkin\.hub\|player\|(.+)/g)].map(match => JSON.parse(match[1]));
assert.equal(fixtures.length, 2);
for (const [index, fixture] of fixtures.entries()) test(`Expose 接收真实 Go 一键签到回执 ${index}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(fixture) }) }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_all', {}), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (!result.value.ok) return;
  assert.deepEqual((result.value.data as any).result, fixture.data.data.results.map((row: any) => ({ name: row.name, status: row.status, message: row.message })));
  assert.equal((result.value.data as any).result[0].status, index === 0 ? 'done' : 'skip');
});
