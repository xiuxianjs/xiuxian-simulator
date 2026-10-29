import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestMeditationActiveRouteReadsOnlyCurrentPlayersMarker$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/MEDITATION_PROGRESS=([^|]+)\|(.+)/g)].map(row => ({ state: row[1], envelope: JSON.parse(row[2]) }));
assert.deepEqual(rows.map(row => row.state), ['not_started', 'active']);

test('闭关进度保留服务端未开始与进行中预估', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    assert.equal(request.method, 'GET');
    if (path === '/api/v1/robot/identity') return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'one', account: { status: 'registered', playerId: 1 } } }) };
    assert.equal(path, '/api/v1/players/1/meditation/progress');
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'one' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_meditation_progress', {}), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const actual = result.value.data as any;
      assert.equal(actual.reason, current.state);
      assert.equal(actual.alreadyMeditating, current.state === 'active');
      assert.equal(actual.expSoFar, current.envelope.data.expSoFar);
      assert.equal(actual.qiSoFar, current.envelope.data.qiSoFar);
    }
  }
});
