import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessMasterQueriesGraduationRebelAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).toString();
const fixtures = [...output.matchAll(/ROBOT_MASTER_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], bid: row[2], envelope: JSON.parse(row[3]) }));
for (const [action, op] of [['get_master_lineage', 'master.lineage'], ['get_master_ranking', 'master.ranking']] as const) test(`${action} 使用真实服务端数据`, async t => {
  const row = fixtures.find(r => r.op === op && r.bid === 'player' && r.envelope.data.success && r.envelope.data.branch === 'business');
  assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    return { status: 200, headers: {}, data: JSON.stringify(row.envelope) };
  } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value)); assert.deepEqual(run.messages, []);
  if (!run.value.ok) return;
  const actual = (run.value.data as any).result; const source = row.envelope.data.data;
  if (action === 'get_master_lineage') {
    assert.equal(actual.nodes[0].userId, source.root.userId);
    assert.equal(actual.nodes[1].userId, source.root.disciples[0].userId);
    assert.equal(actual.nodes[1].parentIndex, 0); assert.equal(actual.nodes[1].isSelf, true);
    assert.equal(actual.nodes[2].parentIndex, 1);
  } else { assert.equal(actual.top[0].userId, source.top[0].userId); assert.equal(actual.self.rank, source.self.rank); }
});
