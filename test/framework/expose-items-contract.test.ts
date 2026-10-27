import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeItemsContracts|TestRobotBusinessExposeSkillSwitchPreviewContract|TestRobotBusinessSkillLearnV1ParityReplacementAndReplay|TestRobotBusinessSkillSwitchV1ParityAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 48 * 1024 * 1024
}).toString();
const fixtures: { action: string; operation: string; input: Record<string, unknown>; envelope: any }[] = [];
for (const match of output.matchAll(/EXPOSE_ITEMS_HTTP=([^|]+)\|([^|]+)\|(.+)/g)) {
  const actions: Record<string, string> = { 'items.consume': 'consume_item', 'green-bottle.capacity': 'get_green_bottle_capacity', 'green-bottle.store': 'store_green_bottles' };
  fixtures.push({ action: actions[match[1]], operation: match[1], input: JSON.parse(match[2]), envelope: JSON.parse(match[3]) });
}
for (const match of output.matchAll(/EXPOSE_SKILL_SWITCH_HTTP=(.+)/g)) fixtures.push({ action: 'switch_skill_book', operation: 'skill-books.switch', input: { skillType: '战技', bookId: 2 }, envelope: JSON.parse(match[1]) });
for (const match of output.matchAll(/ROBOT_SKILL_(LEARN|SWITCH)=(.+)/g)) {
  const row = JSON.parse(match[2]);
  const args = row.arguments;
  if (args.confirm !== null || (args.bookId !== null && (!/^\d+$/.test(args.bookId) || !Number.isSafeInteger(Number(args.bookId)) || Number(args.bookId) < 1))) continue;
  const learn = match[1] === 'LEARN';
  if (learn && args.bookId === null) continue;
  fixtures.push({
    action: learn ? 'learn_skill_book' : args.bookId === null ? 'get_skill_switch_options' : 'switch_skill_book',
    operation: learn ? 'skill-books.learn' : 'skill-books.switch',
    input: { ...(learn ? {} : { skillType: args.skillType }), ...(args.bookId === null ? {} : { bookId: Number(args.bookId) }) },
    envelope: { data: row.result }
  });
}

for (const action of ['consume_item', 'get_green_bottle_capacity', 'store_green_bottles', 'learn_skill_book', 'get_skill_switch_options', 'switch_skill_book']) test(`${action}: 实际 Go 分支与原结算契约`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length, action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    if (current.operation.startsWith('skill-books.')) assert.equal(body.arguments.confirm, null);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const outcomes = new Set<string>();
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify({ current, result: result.value }));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const server = current.envelope.data;
    assert.equal(actual.success, server.success);
    assert.deepEqual(actual.replies, server.middleware.replies);
    if (!server.success) { assert.equal(actual.result, undefined); continue; }
    const data = server.data;
    if (action === 'consume_item') {
      outcomes.add(data.outcome);
      assert.equal(actual.result.outcome, data.outcome);
      assert.equal(actual.result.message, data.message);
      assert.equal(actual.result.remainingQuantity, data.remainingQuantity);
      if (data.outcome === 'peiyuan_pending') assert.deepEqual(actual.result.peiyuanPending, { quantity: data.pending.quantity, view: data.pending.view, ...(data.pending.snapshot ? { snapshot: data.pending.snapshot } : {}) });
      if (data.outcome === 'mingwu_select') assert.deepEqual(actual.result.mingwuSelection, data.pending);
    } else if (action === 'learn_skill_book') {
      outcomes.add(data.outcome);
      assert.equal(actual.result.outcome, data.outcome);
      assert.equal(actual.result.skillBook.id, data.skillBook.id);
      if (data.outcome === 'confirmation_required') {
        assert.deepEqual(actual.result.targetMaximum, data.targetMaximum);
        assert.deepEqual(actual.result.oldMaximum, data.oldMaximum);
        assert.equal(actual.result.oldSkillBook.id, data.oldSkillBook.id);
      }
    } else if (action.includes('switch')) {
      outcomes.add(data.result?.outcome ?? data.code);
      assert.equal(actual.result.code, data.code);
      assert.equal(actual.result.skillType, data.skillType);
      if (data.code === 'SHOW_LIST') assert.deepEqual(actual.result.options, data.options);
      else {
        assert.equal(actual.result.result.outcome, data.result.outcome);
        assert.deepEqual(actual.result.result.skillBook, data.result.skillBook);
        assert.equal(actual.result.result.confirmationMessage, data.result.confirmationMessage);
      }
    } else {
      outcomes.add('received');
      assert.deepEqual(actual.result, data);
    }
  }
  assert.ok(outcomes.size > 0);
  if (action === 'consume_item') for (const branch of ['consumed', 'peiyuan_pending', 'mingwu_select']) assert.ok(outcomes.has(branch), branch);
  if (action === 'learn_skill_book' || action === 'switch_skill_book') assert.ok(outcomes.has('confirmation_required'), '保留确认分支');
});

for (const [label, action, input, data, ok] of [
  ['培元预览缺失', 'consume_item', { itemName: '培元丹', quantity: 1 }, { outcome: 'peiyuan_pending', message: '待确认' }, false],
  ['明悟选项缺失', 'consume_item', { itemName: '明悟丹', quantity: 1 }, { outcome: 'mingwu_select', message: '待选择', pending: {} }, false],
  ['学习回执编号错配', 'learn_skill_book', { bookId: 2 }, { outcome: 'learned', skillBook: { id: 3, name: '剑诀', skillType: '战技', grade: '下品', realm: '炼气', gradeLevel: 1, proficiency: 0 } }, false],
  ['切换回执类型错配', 'switch_skill_book', { skillType: '战技', bookId: 2 }, { code: 'OK', skillType: '神通', result: { outcome: 'switched', skillBook: { id: 2, name: '剑诀', skillType: '神通' } } }, false],
  ['切换选项不得执行切换', 'get_skill_switch_options', { skillType: '战技' }, { code: 'OK', skillType: '战技', result: { outcome: 'switched', skillBook: { id: 2, name: '剑诀', skillType: '战技' } } }, false],
  ['最长道具名与数量', 'consume_item', { itemName: '药'.repeat(64), quantity: 2147483647 }, { outcome: 'consumed', message: '服务端已结算', remainingQuantity: 0 }, true]
] as const) test(`Expose 道具功法边界：${label}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.ok([...body.messageText].length <= 80);
    if (label === '最长道具名与数量') {
      assert.equal([...body.messageText].length, 79);
      assert.equal(Buffer.byteLength(body.messageText, 'utf8'), 211);
      assert.equal(body.arguments.itemName, input.itemName);
      assert.equal(body.arguments.quantity, input.quantity);
    }
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } }, data } }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.value.ok, ok, JSON.stringify(result.value));
});
