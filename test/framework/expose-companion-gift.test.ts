import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessCompanionCommandsGiftV1Arguments|TestRobotBusinessCompanionCommandsGiftLimitsAndCompanionTasks|TestRobotExposeDirectGiftAndReplay|TestRobotExposeDirectGiftTaskAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const allRows = [...output.matchAll(/ROBOT_COMPANION_COMMAND_RESPONSE=companion\.gift\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ args: JSON.parse(row[1]), envelope: JSON.parse(row[3]) }));
const rows = allRows.filter(row => row.args.firstParam === '2' && (!row.args.secondParam || row.args.secondParam === '花'));
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.mode === 'OPTIONS'));
assert.ok(rows.some(row => row.envelope.data.success && row.envelope.data.data?.mode === 'GIFT'));
test('直接转赠使用原目标、类别及数量并保留幂等编号', async t => {
  const fixture = allRows.find(row => row.args.category === '丹药' && row.args.quantity === 2);
  assert.ok(fixture);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, fixture.args);
    assert.equal(body.messageText, '/赠送 丹药 筑基丹 2 2');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'send_direct_item', input), 'ai-plugin');
  const input = { targetUid: 2, itemName: '筑基丹', category: '丹药', quantity: 2, intentId: 'first' };
  const result = await call(input); assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) { const data = result.value.data as any; assert.equal(data.result.targetId, 2); assert.equal(data.result.giftName, '筑基丹'); }
  await call(input); assert.equal(keys[0], keys[1]);
  assert.equal((await call({ ...input, itemName: '2' })).value.ok, false);
  assert.equal((await call({ ...input, quantity: 0 })).value.ok, false);
  assert.equal(keys.length, 2);
});

test('直接转赠任务保留步骤并拒绝目标或数量不一致', async t => {
  const fixture = allRows.find(row => row.args.category === '丹药' && row.args.quantity === 2);
  assert.ok(fixture);
  const taskResponse = output.match(/EXPOSE_DIRECT_GIFT_TASK=(.+)/)?.[1];
  assert.ok(taskResponse);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.taskInput, '赠送 丹药 筑基丹 2 2');
    assert.deepEqual(body.arguments, fixture.args);
    return { status: 200, headers: {}, data: taskResponse };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'send_direct_item', { targetUid: 2, itemName: '筑基丹', category: '丹药', quantity: 2, taskInput }), 'ai-plugin');
  const run = await call('赠送 丹药 筑基丹 2 2');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.equal((run.value.data as any).taskContinuation.outcome, 'next');
  for (const text of ['赠送 丹药 筑基丹 3 2', '赠送 丹药 筑基丹 2 1', '赠送 道具 筑基丹 2 2']) assert.equal((await call(text)).value.ok, false);
  assert.equal(calls, 1);
});
test('按礼物名称查询真实服务端赠礼候选', async t => {
  const targets = allRows.filter(row => ['花', '失踪花'].includes(row.args.firstParam) && !row.args.secondParam && (row.envelope.data.data?.mode === 'TARGETS' || !row.envelope.data.success));
  assert.equal(targets.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = targets[0]; let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of targets) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_gift_targets', { giftName: current.args.firstParam }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = run.value.data as any;
      assert.equal(result.success, current.envelope.data.success);
      if (result.success) {
        assert.deepEqual(result.result.friends, current.envelope.data.data.targets.friends);
        assert.equal(result.result.giftExists, current.envelope.data.data.targets.giftExists);
      } else assert.match(result.replies[0].text, /未找到礼物/);
    }
  }
  const before = calls;
  for (const giftName of ['2', '花 2']) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_gift_targets', { giftName }), 'ai-plugin');
    assert.equal(run.value.ok, false);
  }
  assert.equal(calls, before);
});

test('分类查询由服务端确认可转赠类别', async t => {
  const rows = allRows.filter(row => row.args.firstParam === '筑基丹' && row.args.quantity === 1 && ['丹药', '道具'].includes(row.args.category));
  assert.equal(rows.length, 2);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args);
    assert.equal(body.messageText, `/赠送 ${current.args.category} 筑基丹`);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_gift_targets', { giftName: '筑基丹', category: current.args.category }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = run.value.data as any;
      assert.equal(result.success, current.args.category === '丹药');
      if (result.success) assert.equal(result.result.directCategory, '丹药');
      else assert.match(result.replies[0].text, /未找到/);
    }
  }
});
test('赠礼选项和结算保留目标、库存、奖励与重试', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0]; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/companion.gift');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, current.args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of rows) {
    const gift = !!current.args.secondParam;
    const input = gift ? { targetUid: 2, giftName: '花' } : { targetUid: 2 };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', gift ? 'send_gift' : 'get_gift_options', input), 'ai-plugin');
    const run = await call(); assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any; const source = current.envelope.data;
    assert.equal(result.success, source.success);
    if (source.success && source.branch === 'business') {
      assert.equal(result.result.targetId, 2);
      if (gift) assert.equal(result.result.intimacyGained, source.data.mutation.intimacyGained);
      else assert.deepEqual(result.result.gifts, source.data.options.gifts);
    } else assert.equal(result.result, undefined);
    await call(); if (gift) assert.equal(keys.at(-1), keys.at(-2)); else assert.notEqual(keys.at(-1), keys.at(-2));
  }
});

test('赠礼任务入口保留服务端目标和结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async () => { const envelope = structuredClone(current.envelope); envelope.data.middleware.taskContinuation = { outcome: 'next', command: '我的资料' }; return { status: 200, headers: {}, data: JSON.stringify(envelope) }; } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const mode of ['OPTIONS', 'GIFT']) {
    current = rows.find(row => row.envelope.data.success && row.envelope.data.data?.mode === mode)!; assert.ok(current);
    const gift = mode === 'GIFT'; const action = gift ? 'send_gift' : 'execute_task_gift_options';
    const input = gift ? { targetUid: 2, giftName: '花', taskInput: '赠送 2 花' } : { targetUid: 2, taskInput: '赠送 2' };
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) { const result = run.value.data as any; assert.equal(result.result.targetId, 2); assert.equal(result.taskContinuation.outcome, 'next'); if (gift) assert.equal(result.result.intimacyGained, current.envelope.data.data.mutation.intimacyGained); else assert.deepEqual(result.result.gifts, current.envelope.data.data.options.gifts); }
  }
});
