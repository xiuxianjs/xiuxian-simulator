import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildLeadershipEndConfirmationTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_LEADERSHIP_END_RESPONSE=guild\.impeach\|([^|]+)\|(.+)/g)].map(m => ({ bid: m[1], envelope: JSON.parse(m[2]) })).filter(row => row.envelope.data.success && row.envelope.data.branch === 'business');
assert.ok(rows.some(row => row.envelope.data.data.receipt.outcome === 'counted'));
assert.ok(rows.some(row => row.envelope.data.data.receipt.outcome === 'leader_removed'));
test('弹劾回执保留累计次数及实际继任结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/guild.impeach');
    keys.push(request.headers['idempotency-key']); return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: current.bid });
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'impeach_guild_leader', {}), 'ai-plugin');
    const run = await call(); assert.equal(run.value.ok, true, JSON.stringify(run.value)); assert.deepEqual(run.messages, []);
    if (run.value.ok) {
      const result = (run.value.data as any).result; const receipt = current.envelope.data.data.receipt;
      assert.equal(result.outcome, receipt.outcome); assert.equal(result.impeachCount, receipt.impeachCount);
      assert.equal(result.successorUserId, receipt.successorUserId);
    }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
  }
});
