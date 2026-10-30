import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotEquipmentDetailExposeFixture$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_EQUIPMENT_QUERIES=(.+)/g)].map(row => JSON.parse(row[1])).filter(row => row.op === 'equipment.detail');
assert.ok(rows.some(row => row.result.success) && rows.some(row => !row.result.success));
const supplied = structuredClone(rows.find(row => row.result.success && row.result.data?.item));
supplied.result.data.item.recoveryEffects = [];
rows.push(supplied);
test('穿戴装备详情保留属性和服务端拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/equipment.detail');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.arguments);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: current.result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_equipped_detail', current.arguments), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;
    assert.equal(result.success, current.result.success);
    if (result.success && result.branch === 'business') {
      const source = current.result.data.item;
      for (const key of ['id', 'name', 'isLocked', 'physicalAttack', 'critRate', 'dodgeRate']) assert.equal(result.result.item[key], source[key]);
      if (source.recoveryEffects == null) assert.equal('recoveryEffects' in result.result.item, false);
      else assert.deepEqual(result.result.item.recoveryEffects, source.recoveryEffects);
    } else assert.equal(result.result, undefined);
    await call(); assert.notEqual(keys.at(-1), keys.at(-2));
  }
});

test('任务中的装备详情同时返回推进回执和装备信息，拒绝不匹配的步骤', async t => {
  const row = rows.find(item => item.result.success && item.result.data?.item);
  assert.ok(row);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const command = `我的${row.arguments.typeName}`;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, `/${command}`);
    assert.equal(body.taskInput, command);
    assert.deepEqual(body.arguments, row.arguments);
    keys.push(request.headers['idempotency-key']);
    const result = structuredClone(row.result);
    result.middleware.taskContinuation = { outcome: 'next', command: '我的功法' };
    return { status: 200, headers: {}, data: JSON.stringify({ data: result }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_equipped_detail', { ...row.arguments, taskInput, intentId: 'detail-1' }), 'ai-plugin');
  const first = await call(command);
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) {
    const result = first.value.data as any;
    assert.equal(result.taskContinuation.outcome, 'next');
    assert.equal(result.result.item.id, row.result.data.item.id);
  }
  const retry = await call(command);
  assert.equal(retry.value.ok, true);
  assert.equal(keys[0], keys[1]);
  const invalid = await call(`${command} 错误`);
  assert.equal(invalid.value.ok, false);
  assert.equal(keys.length, 2);
});
