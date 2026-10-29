import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessTeamCoreWritesLifecycleAndReplay|TestRobotBusinessTeamActionsTransactionsAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_TEAM_(?:CORE|ACTION)_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
const find = (operation: string, predicate: (row: any) => boolean) => {
  const row = rows.find(item => item.operation === operation && predicate(item.envelope.data));
  assert.ok(row, operation);
  return row.envelope;
};
const cases = [
  { op: 'teams.realm', action: 'set_team_minimum_realm', input: { realmName: '炼气' }, args: { realmName: '炼气' }, envelope: find('teams.realm', row => row.success && row.data?.outcome === 'updated'), result: 'updated' },
  { op: 'teams.invitation-cancel', action: 'cancel_team_invitation', input: { invitationId: 42 }, args: { invitationId: '42' }, envelope: find('teams.invitation-cancel', row => row.success && row.data?.outcome === 'cancelled'), result: 'cancelled' },
  { op: 'teams.invite', action: 'invite_team_player', input: { targetUid: 4 }, args: { target: { uid: 4 } }, envelope: find('teams.invite', row => row.success && row.data?.status === 0), result: 'done' },
  { op: 'teams.kick', action: 'kick_team_member', input: { targetUid: 2 }, args: { target: { uid: 2 } }, envelope: find('teams.kick', row => row.success && row.data?.kicked), result: 'done' },
  { op: 'teams.position', action: 'set_team_position', input: { targetUid: 2, position: 3 }, args: { targetUid: '2', position: '3' }, envelope: find('teams.position', row => row.success && row.data?.outcome === 'updated'), result: 'updated' },
  { op: 'teams.leadership', action: 'transfer_team_leadership', input: { targetUid: 2 }, args: { targetUid: '2' }, envelope: find('teams.leadership', row => row.success && row.data?.outcome === 'transferred'), result: 'transferred' },
  { op: 'teams.position', action: 'set_team_position', input: { targetUid: 3, position: 1 }, args: { targetUid: '3', position: '1' }, envelope: find('teams.position', row => !row.success), result: null }
];
test('队伍管理保留服务端结果、权限拒绝及稳定重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = cases[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of cases) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, current.input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.envelope.data.success);
    if (current.result) assert.equal(result.result.outcome, current.result);
    else assert.equal(result.result, undefined);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
