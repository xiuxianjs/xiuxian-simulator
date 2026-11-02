import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBaseRealmQueries$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/BASE_REALM_RESPONSE=([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], envelope: JSON.parse(row[2]) }));
test('境界基础目录及详情返回真实配置并拒绝玩家参数', async t => {
  assert.equal(rows.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    count++; assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  for (current of rows) {
    const page = current.operation === 'base.realms';
    const run = await call(page ? 'get_base_realms' : 'get_base_realm', page ? {} : { realmId: 1 });
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { const data = (run.value.data as any).result; const row = page ? data.items[0] : data; assert.equal(row.name, '配置境界'); assert.equal(row.experienceLimit, 12345); assert.equal(row.physicalAttack, 678); assert.equal(row.playerId, undefined); }
  }
  const before = count;
  assert.equal((await call('get_base_realm', { realmId: 1, uid: 999 })).value.ok, false);
  assert.equal(count, before);
});
