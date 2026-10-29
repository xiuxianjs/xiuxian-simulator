import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotTeamApplicationsExposeFixture|TestRobotBusinessTeamActionsTransactionsAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const query = JSON.parse(output.match(/ROBOT_TEAM_APPLICATIONS_EXPOSE=(.+)/)![1]);
const entries = [...output.matchAll(/ROBOT_TEAM_ACTION_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
const cancelled = entries.find(row => row.operation === 'teams.application-cancel' && row.envelope.data.data?.outcome === 'cancelled')?.envelope;
const notPending = entries.find(row => row.operation === 'teams.application-cancel' && row.envelope.data.data?.outcome === 'not_pending')?.envelope;
const rejected = entries.find(row => row.operation === 'teams.invitation-reject' && row.envelope.data.data?.rejected)?.envelope;
const denied = entries.find(row => row.operation === 'teams.invitation-reject' && !row.envelope.data.success)?.envelope;
assert.ok(cancelled && notPending && rejected && denied);

test('队伍申请查询与处理保留服务端状态及重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = query; let expected: any = {};
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expected);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const read = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_my_team_applications', {}), 'ai-plugin');
  const snapshot = await read(); assert.equal(snapshot.value.ok, true);
  if (snapshot.value.ok) assert.deepEqual((snapshot.value.data as any).result.records, query.data.data.records);
  await read(); assert.notEqual(keys.at(-1), keys.at(-2));
  for (const row of [
    { action: 'cancel_team_application', input: { applicationId: 21 }, args: { applicationId: '21' }, envelope: cancelled },
    { action: 'cancel_team_application', input: { applicationId: 22 }, args: { applicationId: '22' }, envelope: notPending },
    { action: 'reject_team_invitation', input: { invitationId: 41 }, args: { invitationId: '41' }, envelope: rejected },
    { action: 'reject_team_invitation', input: { invitationId: 43 }, args: { invitationId: '43' }, envelope: denied }
  ]) {
    current = row.envelope; expected = row.args;
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', row.action, row.input), 'ai-plugin');
    const result = await call(); assert.deepEqual(result.errors, []); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const data = result.value.data as any;
    assert.equal(data.success, current.data.success);
    if (data.success) assert.equal(data.result.outcome ?? data.result.rejected, current.data.data.outcome ?? current.data.data.rejected);
    else assert.equal(data.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
