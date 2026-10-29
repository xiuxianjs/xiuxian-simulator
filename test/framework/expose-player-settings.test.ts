import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessSettingsIdentityMergeAndSnapshot|TestRobotConfirmationPreferencesExposeFixture)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_SETTINGS_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
const defs = [
  { op: 'settings.team-dungeon-energy', action: 'set_team_dungeon_energy', field: 'teamDungeonNoMental', value: true },
  { op: 'settings.hide-profile', action: 'set_profile_hidden', field: 'hideProfile', value: true },
  { op: 'settings.friend-team-approval', action: 'set_friend_team_approval', field: 'autoApproveFriendTeam', value: false },
  { op: 'settings.team-invites', action: 'set_team_invitations_enabled', field: 'teamInviteEnabled', value: false },
  { op: 'settings.meditation-auto-boost', action: 'set_meditation_auto_boost', field: 'meditationAutoBoost', value: true },
  { op: 'settings.dungeon-battle-mode', action: 'set_dungeon_battle_mode', field: 'dungeonBattleMode', value: 'manual' },
  { op: 'settings.team-auto-accept-invite', action: 'set_team_auto_accept', field: 'teamAutoAcceptInvite', value: 'friend' }
];
const thresholdRows = [...output.matchAll(/ROBOT_CONFIRM_PREF_EXPOSE=([^|]+)\|([0-9]+)\|(.+)/g)].map(row => ({ operation: row[1], value: Number(row[2]), envelope: JSON.parse(row[3]) }));
const overview = rows.find(row => row.operation === 'settings.overview' && row.envelope.data.data?.groupSnapshot === null && row.envelope.data.data?.preferences);
assert.ok(overview);
const cases: Array<{ op: string; action: string; field: string; value: boolean | string | number; envelope: any }> = defs.map(spec => {
  const row = rows.find(item => item.operation === spec.op && item.envelope.data.data?.[spec.field] === spec.value);
  assert.ok(row, spec.op);
  return { ...spec, envelope: row.envelope };
});
for (const row of thresholdRows) {
  const spirit = row.operation === 'settings.spirit-crystal-confirmation';
  cases.push({ op: row.operation, action: spirit ? 'set_spirit_crystal_confirmation' : 'set_dao_crystal_confirmation', field: spirit ? 'confirmSpiritCrystal' : 'confirmDaoCrystal', value: row.value, envelope: row.envelope });
}
assert.equal(thresholdRows.length, 4);
test('设置查询与更新保留本人服务端回执和重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = 'settings.overview'; let args: any = { includeGroup: false }; let current = overview.envelope;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    assert.equal(request.headers['x-bid'], 'player');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const read = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_player_settings', {}), 'ai-plugin');
  const snapshot = await read(); assert.equal(snapshot.value.ok, true, JSON.stringify(snapshot.value));
  if (snapshot.value.ok) assert.deepEqual(JSON.parse((snapshot.value.data as any).result.preferencesJson), current.data.data.preferences);
  await read(); assert.notEqual(keys.at(-1), keys.at(-2));
  for (const item of cases) {
    op = item.op; current = item.envelope; args = { value: item.value };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', item.action, args), 'ai-plugin');
    const result = await call(); assert.deepEqual(result.errors, []); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).result[item.field], item.value);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
