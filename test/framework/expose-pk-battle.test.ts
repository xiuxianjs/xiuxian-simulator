import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/service', '-run', '^TestPKExposeBattleReceipts$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/PK_EXPOSE_RECEIPT=([^|]+)\|(\d+)\|(.+)/g)].map(row => ({ kind: row[1], uid: Number(row[2]), data: JSON.parse(row[3]) }));
assert.equal(rows.length, 2);
const base = JSON.parse(readFileSync(new URL('../fixtures/expose-master.json', import.meta.url), 'utf8')).teach;

test('争夺和免费反击返回真实战斗结果与暂存状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }); let current = rows[0]; let data = current.data; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.kind === 'attack' ? 'pvp.robbery' : 'pvp.counter-attack'}`);
    assert.deepEqual(body.arguments, current.kind === 'attack' ? { target: { uid: 2 } } : { logId: String(rows[0].data.logId) });
    keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(base); envelope.data.middleware.identity.account.playerId = current.uid; envelope.data.data = data;
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  for (current of rows) {
    data = current.data;
    const action = current.kind === 'attack' ? 'rob_player' : 'counter_pk_attack';
    const input = current.kind === 'attack' ? { targetUid: 2 } : { reportId: rows[0].data.logId };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok) {
      const response = (result.value.data as any).result;
      assert.equal(response.pk.pkEventId, data.pkEventId); assert.equal(response.pk.won, data.won); assert.equal(response.pk.pkDeliveryState, data.pkDeliveryState);
      if (current.kind === 'counter') assert.equal(response.counterHpCost, 0);
    }
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    data = { ...current.data, pkRulesVersion: 2 };
    const invalid = await call(); assert.equal(invalid.value.ok, false);
  }
});
