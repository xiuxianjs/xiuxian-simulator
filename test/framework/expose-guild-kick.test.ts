import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildKickDirectoryTargetsTransactionAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixture = [...output.matchAll(/ROBOT_GUILD_KICK_RESPONSE=guild\.kick\|player\|(.+)/g)].map(row => JSON.parse(row[1])).find(row => row.data.success && row.data.data?.receipt?.targetUserId === 2);
assert.ok(fixture);
test('移出宗门成员保留实际目标和稳定重试范围', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = []; let data = structuredClone(fixture);
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/guild.kick');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { mode: 'action', target: { uid: 2 } }); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(data) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'kick_guild_member', { targetUid: 2 }), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const result = await call(); assert.equal(result.value.ok, true, JSON.stringify(result.value)); assert.deepEqual(result.messages, []);
    if (result.value.ok) { assert.equal((result.value.data as any).result.outcome, 'kicked'); assert.equal((result.value.data as any).result.targetUserId, 2); }
  }
  assert.equal(keys[0], keys[1]);
  data = structuredClone(fixture); data.data.data.receipt.targetUserId = 3;
  assert.equal((await call()).value.ok, false);
});
