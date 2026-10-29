import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^TestExposeEquippedFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/EXPOSE_EQUIPPED=(\d+)\|(.+)/g)].map(row => ({ uid: Number(row[1]), envelope: JSON.parse(row[2]) }));
assert.equal(rows.length, 2);
test('配装及套装状态保留真实服务端事实', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'player', account: { status: 'registered', playerId: current.uid } } }) };
    assert.equal(path, `/api/v1/players/${current.uid}/equipment/equipped`);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_equipped', {}), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const data = run.value.data as any;
    assert.equal(data.items.length, current.envelope.data.items.length);
    assert.equal(data.sets.length, current.envelope.data.sets.length);
    for (const [index, set] of data.sets.entries()) {
      assert.equal(set.count, current.envelope.data.sets[index].count);
      assert.deepEqual(set.effects, current.envelope.data.sets[index].effects.map(({ active, effect }: any) => ({ active, effect: Object.fromEntries(Object.entries(effect).filter(([key]) => key in set.effects[0].effect)) })));
    }
  }
});
