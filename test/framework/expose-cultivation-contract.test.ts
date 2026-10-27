import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessRealmOverview|TestRobotBusinessSoulPathState)', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
}).toString();
for (const [marker, action] of [['ROBOT_REALM_OVERVIEW', 'get_realm'], ['ROBOT_SOUL_STATE', 'get_soul_path']]) {
  const rows = [...output.matchAll(new RegExp(marker + '=(.+)', 'g'))].map(match => JSON.parse(match[1])).filter(row => row.status === 200 && row.state !== 'muted');
  assert.ok(rows.length > 0, marker);
  test(`${action} 对接实际服务端多状态响应`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    let current = rows[0];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => ({ status: 200, headers: {}, data: JSON.stringify(request.url.endsWith('/robot/identity') ? { data: { bid: 'owner', account: { status: 'registered', playerId: 1 } } } : current.v1) }) }));
    for (current of rows) {
      const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
      if (action === 'get_realm' && ['unsafe-material', 'unsafe-exp'].includes(current.state)) {
        assert.equal(result.value.ok, false);
        if (!result.value.ok) assert.equal(result.value.error.code, 'INVALID_OUTPUT');
        continue;
      }
      assert.equal(result.value.ok, true, current.state + ' ' + JSON.stringify(result.value));
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.messages, []);
      if (!result.value.ok) continue;
      const data = result.value.data as any;
      if (action === 'get_realm') {
        assert.equal(data.playerId, 1);
        assert.equal(data.breakthrough.canBreak, current.v1.data.breakthrough.canBreak);
        assert.equal(data.promotion.canPromote, current.v1.data.promotion.canPromote);
        assert.equal(data.promotion.probability?.finalProbability, current.v1.data.promotion.probability?.finalProbability);
      } else {
        assert.equal(data.pathKey, current.v1.data.pathKey ?? undefined);
        assert.equal(data.stability, current.v1.data.stability);
        assert.deepEqual(data.panel.materials, current.v1.data.panel.materials);
        assert.equal(data.panel.nextNode?.canAdvance, current.v1.data.panel.nextNode?.canAdvance);
      }
    }
  });
}
