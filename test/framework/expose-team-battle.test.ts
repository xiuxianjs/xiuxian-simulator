import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeTeamBattles$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/EXPOSE_TEAM_BATTLE=(teams\.battle-(?:records|detail))\|([^|]+)\|(.+)/g)].map(m => ({ operation: m[1], args: JSON.parse(m[2]), envelope: JSON.parse(m[3]) }));
for (const action of ['get_team_battle_records', 'get_team_battle_detail'] as const) test(`${action}: 服务端记录和权限`, async t => {
  const candidates = rows.filter(row => row.operation === (action === 'get_team_battle_records' ? 'teams.battle-records' : 'teams.battle-detail'));
  assert.ok(candidates.length);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = candidates[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    assert.equal(request.headers['x-bid'], 'player');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of candidates) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const input = action === 'get_team_battle_records' ? {} : { recordId: Number(current.args.recordId) };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []); assert.deepEqual(run.messages, []); assert.deepEqual(run.actions, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const value = run.value.data as any;
    assert.equal(value.success, current.envelope.data.success);
    if (value.success && action === 'get_team_battle_detail') {
      if (value.result.found) {
        assert.equal(value.result.detail.id, Number(current.args.recordId));
        const member = value.result.detail.members[0];
        assert.equal(member.userId, 1);
        assert.equal(member.isLeader, true);
        assert.deepEqual(JSON.parse(member.rewardSnapshotJson), { spiritStone: 12, items: [{ name: '灵草', quantity: 2 }] });
      }
      if (current.args.recordId === '32') assert.equal(value.result.error, '你无权查看该队伍战斗记录');
      if (current.args.recordId === '999') assert.equal(value.result.found, false);
    }
    const again = await call();
    assert.equal(again.value.ok, true);
    assert.notEqual(keys.at(-1), keys.at(-2));
  }
});
