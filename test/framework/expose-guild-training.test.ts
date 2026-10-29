import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildTrainingStateCostsPermissionsRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_TRAINING_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
for (const op of ['guild.training-overview', 'guild.training-upgrade']) {
  assert.ok(rows.some(row => row.op === op && row.envelope.data.success));
  assert.ok(rows.some(row => row.op === op && !row.envelope.data.success));
}
test('宗门战备保留真实成本、升级结果及权限拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; let args: any = {}; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, args);
    if (current.op === 'guild.training-upgrade') assert.equal(body.messageText, `/宗门战备 ${args.branch} ${args.key}`);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const read = current.op === 'guild.training-overview';
    const source = current.envelope.data;
    args = read ? {} : { branch: source.data?.branch ?? '个人', key: source.data?.key ?? '攻' };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', read ? 'get_guild_battle_training' : 'upgrade_guild_battle_training', args), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      if (read) {
        assert.equal(result.result.canUpgradeTeam, source.data.canUpgradeTeam);
        assert.equal(result.result.team[0].level, source.data.team[0].level);
        assert.equal(result.result.personal[0].nextCostContribution, source.data.personal[0].nextCostContribution ?? undefined);
      } else {
        assert.equal(result.result.newLevel, source.data.newLevel);
        assert.equal(result.result.costText, source.data.costText);
      }
    } else assert.equal(result.result, undefined);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
  }
});
