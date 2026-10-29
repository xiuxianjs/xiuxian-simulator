import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('师谱保留父子关系与当前玩家，榜单保留本人状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let empty = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const op = new URL(request.url).pathname.split('/').at(-1);
    const stats = { virtueLevel: 2, virtueTitle: '贤师', virtueExperience: 50, totalGraduatedCount: 1, activeDiscipleCount: 1 };
    const data = op === 'master.lineage' ? { root: empty ? null : { userId: 2, name: '师父', realmName: '筑基', relationStatus: null, disciples: [{ userId: 7, name: '修士', realmName: '炼气', relationStatus: 1, disciples: [{ userId: 9, name: '徒弟', realmName: '炼气', relationStatus: 2, disciples: [] }] }] } } : { top: [{ ...stats, rank: 1, userId: 2, userName: '师父' }], nearby: [], self: { ...stats, rank: 5 } };
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const run = (action: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
  const tree = await run('get_master_lineage'); assert.equal(tree.value.ok, true, JSON.stringify(tree.value));
  if (tree.value.ok) { const nodes = (tree.value.data as any).result.nodes; assert.equal(nodes.length, 3); assert.equal(nodes[1].parentIndex, 0); assert.equal(nodes[1].isSelf, true); assert.equal(nodes[2].parentIndex, 1); assert.equal(nodes[2].relationStatusText, '已出师'); }
  const ranking = await run('get_master_ranking'); assert.equal(ranking.value.ok, true, JSON.stringify(ranking.value));
  if (ranking.value.ok) { assert.equal((ranking.value.data as any).result.self.rank, 5); assert.equal((ranking.value.data as any).result.top[0].masterVirtueExp, 50); }
  empty = true; const blank = await run('get_master_lineage'); assert.equal(blank.value.ok, true);
  if (blank.value.ok) assert.deepEqual((blank.value.data as any).result.nodes, []);
  assert.deepEqual(tree.messages, []);
});
