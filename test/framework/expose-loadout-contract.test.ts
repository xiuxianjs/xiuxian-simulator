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
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
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

test('装备实例编号直接穿戴，回执不匹配时不报告成功', async t => {
  const rows = [...output.matchAll(/ROBOT_EQUIPMENT_EQUIP=(.+)/g)].map(match => JSON.parse(match[1]));
  const row = rows.find(item => item.arguments.identifier === '2' && item.result.success && item.result.data?.equipment?.id === 2);
  assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let envelope = structuredClone(row.result);
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/equipment.equip');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { identifier: '2' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: envelope }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: row.result.middleware.identity.bid });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'equip_equipment_by_id', { instanceId: 2 }), 'ai-plugin');
  const first = await call();
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) assert.equal((first.value.data as any).result.equipment.id, 2);
  const retry = await call();
  assert.equal(retry.value.ok, true, JSON.stringify(retry.value));
  assert.equal(keys[0], keys[1]);
  envelope = structuredClone(row.result);
  envelope.data.equipment.id = 3;
  const mismatch = await call();
  assert.equal(mismatch.value.ok, false);
});

test('装备任务步骤保留 Go 结算与任务推进回执', async t => {
  const equipRows = [...output.matchAll(/ROBOT_EQUIPMENT_EQUIP=(.+)/g)].map(match => JSON.parse(match[1]));
  const loadoutRows = [...output.matchAll(/ROBOT_EQUIPMENT_LOADOUT=(.+)/g)].map(match => JSON.parse(match[1]));
  const equip = equipRows.find(row => row.arguments.identifier === '2' && row.result.success && row.result.data?.equipment?.id === 2);
  const auto = loadoutRows.find(row => row.op === 'equipment.auto-equip' && row.result.success && row.result.branch === 'business');
  assert.ok(equip && auto);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = equip;
  t.mock.method(axios, 'create', () => ({ request: async () => { const result = structuredClone(current.result); result.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify({ data: result }) }; } }));
  for (const [action, input, row] of [['equip_equipment_by_id', { instanceId: 2, taskInput: '装备 2' }, equip], ['auto_equip_equipment', { taskInput: '一键装备' }, auto]] as const) {
    current = row; const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: row.result.middleware.identity.bid }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { const actual = run.value.data as any; assert.equal(actual.taskContinuation.outcome, 'next'); if (action === 'equip_equipment_by_id') assert.equal(actual.result.equipment.id, 2); else assert.deepEqual(actual.result.results, row.result.data.results); }
  }
});

test('功法显隐任务步骤校验完整指令并保留原业务回执和重试编号', async t => {
  const rows = [...output.matchAll(/ROBOT_SKILL_VISIBILITY=(.+)/g)].map(match => JSON.parse(match[1]));
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: any;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.taskInput, current.command);
    assert.equal(body.messageText, `/${current.command}`);
    assert.deepEqual(body.arguments, { bookId: String(current.bookId) });
    keys.push(request.headers['idempotency-key']);
    const result = structuredClone(current.row.result);
    result.middleware.taskContinuation = { outcome: 'next', command: '我的功法' };
    return { status: 200, headers: {}, data: JSON.stringify({ data: result }) };
  } }));
  for (const [action, operation, verb] of [['hide_skill_book', 'skill-books.hide', '隐藏功法'], ['show_skill_book', 'skill-books.show', '显示功法']] as const) {
    const row = rows.find(item => item.op === operation && item.result.success && item.result.branch === 'business' && item.result.data?.code === 'UPDATED');
    assert.ok(row);
    const bookId = Number(row.arguments.bookId);
    current = { row, bookId, command: `${verb} ${bookId}` };
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: row.result.middleware.identity.bid });
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { bookId, taskInput, intentId: 'same-operation' }), 'ai-plugin');
    const first = await call(current.command);
    assert.equal(first.value.ok, true, JSON.stringify(first.value));
    if (first.value.ok) {
      const result = first.value.data as any;
      assert.equal(result.taskContinuation.outcome, 'next');
      assert.equal(result.result.bookId, bookId);
      assert.equal(result.result.isHidden, operation === 'skill-books.hide');
    }
    const retry = await call(current.command);
    assert.equal(retry.value.ok, true, JSON.stringify(retry.value));
    assert.equal(keys.at(-1), keys.at(-2));
    const count = keys.length;
    const invalid = await call(`${verb} ${bookId + 1}`);
    assert.equal(invalid.value.ok, false);
    if (!invalid.value.ok) assert.equal(invalid.value.error.code, 'INVALID_INPUT');
    assert.equal(keys.length, count);
  }
});
