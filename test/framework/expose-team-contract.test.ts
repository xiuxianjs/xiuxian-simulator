import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeTeamContracts$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_TEAM_HTTP=([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)]
  .map(match => ({ action: match[1], operation: match[2], bid: match[3], input: JSON.parse(match[4]), envelope: JSON.parse(match[5]) }));
function omitNull(value: any): any {
  if (Array.isArray(value)) return value.map(omitNull);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([, value]) => value !== null).map(([key, value]) => [key, omitNull(value)]));
}
const actions = ['get_my_team', 'get_team_info', 'get_team_list', 'create_team', 'apply_to_team', 'leave_team', 'disband_team', 'get_team_applications', 'approve_team_application', 'reject_team_application', 'get_team_match', 'start_mainline_match', 'start_dungeon_match', 'cancel_team_match'];
for (const action of actions) test(`${action}: 实际 Go 角色权限、队伍状态与匹配回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0, action);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], current.bid);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.ok([...body.messageText].length <= 80);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const outcomes = new Set<string>();
  let success = 0;
  let refused = 0;
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: current.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { refused++; assert.equal(actual.result, undefined); continue; }
    success++;
    const data = server.data;
    if (action === 'get_my_team' || action === 'get_team_info') {
      assert.deepEqual(actual.result, {
        ...(action === 'get_my_team' ? { access: omitNull(data.access) } : {}),
        hasTeam: data.team?.exists ?? false,
        ...(data.team ? { team: omitNull(data.team) } : {})
      });
      outcomes.add(actual.result.hasTeam ? 'team' : 'none');
    } else if (action === 'create_team' || action === 'approve_team_application') {
      assert.deepEqual(actual.result, { teamId: data.id });
    } else if (action === 'apply_to_team') {
      assert.deepEqual(actual.result, { applicationId: data.id, teamId: data.teamId, status: data.status, autoApproved: data.status === 1 });
      outcomes.add(data.status === 1 ? 'joined' : 'pending');
    } else if (action === 'get_team_match') {
      assert.deepEqual(actual.result, data === null ? { matching: false } : { matching: true, snapshot: { targetLabel: data.targetLabel, waitedSeconds: data.waitedSeconds, timeoutSeconds: data.timeoutSeconds, phase: data.phase } });
      outcomes.add(data === null ? 'none' : 'queued');
    } else if (action === 'start_mainline_match' || action === 'start_dungeon_match') {
      assert.deepEqual(actual.result, { targetLabel: data.targetLabel });
    } else if (action === 'get_team_applications') {
      assert.deepEqual(actual.result, data.error ? { canReview: false, error: data.error } : { ...omitNull(data), canReview: true });
      outcomes.add(data.error ? 'denied' : 'review');
    } else {
      assert.deepEqual(actual.result, omitNull(data));
      if (action === 'cancel_team_match') outcomes.add(data.cancelled ? 'cancelled' : 'none');
    }
  }
  assert.ok(success > 0);
  if (['approve_team_application', 'reject_team_application', 'disband_team', 'create_team'].includes(action)) assert.ok(refused > 0);
  if (['get_my_team', 'get_team_info', 'get_team_match', 'get_team_applications', 'apply_to_team', 'cancel_team_match'].includes(action)) assert.equal(outcomes.size, 2);
});

const target = { teamId: 9, exists: true, leaderName: null, memberCount: 1, maxMembers: 6, minRealmName: null, target: null, isMember: false, isLeader: false, ownMembershipLeader: false, members: [{ userId: 9, name: null, isLeader: true, position: 1 }], actions: Object.fromEntries('canApply canInvite canManageMembers canReviewApplications canUseTeamMail canViewDungeon canLeave canDisband canViewInvitations'.split(' ').map(key => [key, false])) };
for (const [label, action, input, data, ok] of [
  ['错队伍回执', 'get_team_info', { teamId: 8 }, { access: { ok: false, realmName: null }, team: target }, false],
  ['保留缺失姓名', 'get_team_info', { teamId: 9 }, { access: { ok: false, realmName: null }, team: target }, true],
  ['申请状态非法', 'apply_to_team', { teamId: 8 }, { id: 2, teamId: 8, status: 2 }, false],
  ['匹配目标为空', 'start_dungeon_match', { dungeonId: 5 }, { targetLabel: '' }, false],
  ['取消结果矛盾', 'cancel_team_match', {}, { cancelled: true, targetLabel: null }, false],
  ['查询队伍不能自动创建', 'get_my_team', {}, { id: 8 }, false]
] as const) test(`Expose 队伍契约边界：${label}`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } }, data } }) }) }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, ok, JSON.stringify(result.value));
  if (result.value.ok) {
    const actual = result.value.data as any;
    assert.equal(actual.result.team.leaderName, undefined);
    assert.equal(actual.result.team.members[0].name, undefined);
    assert.equal(actual.result.access, undefined);
  }
});
