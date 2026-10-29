import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildLeaveCancelAbsenceAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const fixtures = [...output.matchAll(/ROBOT_GUILD_LEAVE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) })).filter(row => row.envelope.data.success && row.envelope.data.branch === 'business');
test('退出宗门保留确认状态、原消息重试和退出冷却', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  let firstLeaveKey = '';
  for (const [operation, action, outcome] of [
    ['guild.leave', 'request_or_confirm_guild_leave', 'confirmation_required'],
    ['guild.leave-cancel', 'cancel_guild_leave', 'cancel'],
    ['guild.leader-leave', 'take_guild_leader_leave', 'leave_granted'],
    ['guild.leave', 'request_or_confirm_guild_leave', 'left']
  ] as const) {
    op = operation;
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const fixture = fixtures.find(row => row.op === op && (outcome === 'cancel' ? row.envelope.data.data.deleted === true :
      outcome === 'leave_granted' ? row.envelope.data.data.receipt?.outcome === outcome : row.envelope.data.data.outcome === outcome));
    envelope = structuredClone(fixture?.envelope); assert.ok(envelope, outcome);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && outcome === 'left') assert.equal((result.value.data as any).result.cooldownHours, 24);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    if (outcome === 'confirmation_required') firstLeaveKey = keys.at(-1)!;
    if (outcome === 'left') assert.notEqual(keys.at(-1), firstLeaveKey);
  }
});
