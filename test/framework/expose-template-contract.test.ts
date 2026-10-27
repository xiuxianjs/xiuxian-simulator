import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBattleTemplatesV1ParityAndReplay$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/ROBOT_BATTLE_TEMPLATE=(.+)/g)].map(match => JSON.parse(match[1])).filter(row => row.op !== 'battle-templates.list');
assert.equal(fixtures.length, 110);
test('Expose 战斗模板：实际服务端成功、拒绝、旧模板、回滚与槽位边界', async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = fixtures[0];
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const args = (typeof request.data === 'string' ? JSON.parse(request.data) : request.data).arguments;
    assert.equal(args.slotText, String(Number(current.arguments.slotText)));
    assert.equal(args.name, current.arguments.name ?? null);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  for (current of fixtures) {
    const slot = Number(current.arguments.slotText);
    const op = current.op.split('.')[1];
    const before = calls;
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: current.result.middleware.identity.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', `${op}_battle_template`, { slot, ...(op === 'save' && current.arguments.name != null ? { name: current.arguments.name } : {}) }), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    if (!Number.isSafeInteger(slot) || slot < 1 || slot > 5) {
      assert.equal(result.value.ok, false);
      if (!result.value.ok) assert.equal(result.value.error.code, 'INVALID_INPUT');
      assert.equal(calls, before);
      continue;
    }
    assert.equal(result.value.ok, true, `${current.state} ${op} ${JSON.stringify(result.value)}`);
    if (!result.value.ok) continue;
    const data = result.value.data as any;
    assert.equal(data.success, current.result.success);
    assert.equal(data.branch, current.result.branch);
    assert.equal(data.reason, current.result.middleware.reason);
    if (data.result) {
      if (op === 'delete') assert.equal(data.result.deleted, current.result.data.deleted);
      else {
        assert.equal(data.result.name, current.result.data.name);
        assert.equal(data.result.slot, slot);
        assert.deepEqual(data.result.equipmentNames, current.result.data.equipmentNames);
        assert.deepEqual(data.result.skills, Object.entries(current.result.data.skillNames).map(([slot, name]) => ({ slot, name })));
      }
    } else assert.ok(!current.result.success || current.result.branch === 'middleware');
  }
});
