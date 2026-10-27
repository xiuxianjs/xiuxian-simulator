import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessEquipmentEquipV1ParityAndReplay|TestRobotBusinessEquipmentUnequipOneV1ParityAndReplay|TestRobotBusinessEquipmentAutoEquipV1ParityAndReplay|TestRobotBusinessSkillVisibilityV1ParityReplayAndAdmission|TestRobotBusinessSkillUnequipV1ParityAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
}).toString();
const specs = [
  { marker: 'ROBOT_EQUIPMENT_EQUIP', operation: 'equipment.equip', action: 'equip_equipment' },
  { marker: 'ROBOT_EQUIPMENT_LOADOUT', operation: 'equipment.unequip-one', action: 'unequip_equipment' },
  { marker: 'ROBOT_EQUIPMENT_LOADOUT', operation: 'equipment.auto-equip', action: 'auto_equip_equipment' },
  { marker: 'ROBOT_SKILL_VISIBILITY', operation: 'skill-books.hide', action: 'hide_skill_book' },
  { marker: 'ROBOT_SKILL_VISIBILITY', operation: 'skill-books.show', action: 'show_skill_book' },
  { marker: 'ROBOT_SKILL_UNEQUIP', operation: 'skill-books.unequip', action: 'unequip_skill_book' }
];
for (const spec of specs) test(`${spec.action}: 实际服务端多状态回执`, async t => {
  const rows = [...output.matchAll(new RegExp(spec.marker + '=(.+)', 'g'))].map(match => JSON.parse(match[1])).filter(row => !row.op || row.op === spec.operation);
  assert.ok(rows.length > 0);
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${spec.operation}`);
    const args = (typeof request.data === 'string' ? JSON.parse(request.data) : request.data).arguments;
    assert.deepEqual(args, 'bookId' in current.arguments ? { ...current.arguments, bookId: String(Number(current.arguments.bookId)) } : current.arguments);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  let successful = 0;
  for (current of rows) {
    const input = { ...current.arguments };
    if ('bookId' in input && /^\d+$/.test(input.bookId)) input.bookId = Number(input.bookId);
    const invalid = 'bookId' in input && (!Number.isSafeInteger(input.bookId) || input.bookId < 1);
    const before = calls;
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: current.result.middleware.identity.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', spec.action, input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    if (invalid) {
      assert.equal(result.value.ok, false);
      if (!result.value.ok) assert.equal(result.value.error.code, 'INVALID_INPUT');
      assert.equal(calls, before);
      continue;
    }
    assert.equal(result.value.ok, true, `${current.state} ${current.text} ${JSON.stringify(result.value)}`);
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    assert.equal(actual.success, current.result.success);
    assert.equal(actual.branch, current.result.branch);
    assert.equal(actual.reason, current.result.middleware.reason);
    if (current.result.success && current.result.branch === 'business') {
      successful++;
      assert.ok(actual.result);
      for (const key of ['outcome', 'stage', 'instanceId', 'code', 'bookId', 'isHidden', 'success', 'message']) if (key in current.result.data) assert.equal(actual.result[key], current.result.data[key]);
      if (spec.action === 'equip_equipment') assert.equal(actual.result.equipment.id, current.result.data.equipment.id);
      if (spec.action === 'auto_equip_equipment') assert.deepEqual(actual.result.results, current.result.data.results);
    } else assert.equal(actual.result, undefined);
  }
  assert.ok(successful > 0);
});
