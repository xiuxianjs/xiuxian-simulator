import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestBattleLogQueryRoutes$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const match = output.match(/ROBOT_BATTLE_MEMORY_EXPOSE=(.+)/);
assert.ok(match);
const original = JSON.parse(match[1]);

test('分页读取公开战斗回忆，不续期或重新战斗', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const envelope = structuredClone(original);
  const action = { round: 1, wave: 1, actor: 'player_1', actorName: '修士', actionType: 'attack', phase: 'action', skillName: '普攻', targets: ['pet_2'], mpCost: 0, mpGain: 0, mentalCost: 0, mentalGain: 0, damageResults: [{ actorId: 'player_1', targetId: 'pet_2', kind: 'damage', damage: 5, actualDamage: 5, dodged: false, crit: false, killed: false }] };
  envelope.data.actions = [action, { ...action, round: 2 }];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(request.method, 'GET');
    assert.equal(new URL(request.url).pathname, '/api/v1/battle-memories/opaque');
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (offset: number) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_battle_memory', { logId: 'opaque', offset, limit: 1 }), 'ai-plugin');
  const first = await call(0);
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) {
    const data = first.value.data as any;
    assert.equal(data.totalActions, 2);
    assert.equal(data.hasMore, true);
    assert.equal(data.actions[0].damageResults[0].actualDamage, 5);
  }
  const second = await call(1);
  assert.equal(second.value.ok, true, JSON.stringify(second.value));
  if (second.value.ok) { assert.equal((second.value.data as any).actions[0].round, 2); assert.equal((second.value.data as any).hasMore, false); }
  envelope.data.logId = 'other';
  assert.equal((await call(0)).value.ok, false);
});
