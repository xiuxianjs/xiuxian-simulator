import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^(TestRobotBusinessExposeSoulContracts|TestRobotBusinessExposeSpiritRootContracts|TestRobotBusinessSoulConfirmV1ParityAndReplay)$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024
}).toString();
const fixtures = [...output.matchAll(/EXPOSE_SOUL_HTTP=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)]
  .map(match => ({ action: match[1], operation: match[2], input: JSON.parse(match[3]), envelope: JSON.parse(match[4]) }));
const nurtureKeys = ['direction', 'directionName', 'tier', 'tierName', 'stabilityBefore', 'stabilityAfter', 'insightGained', 'proficiencyGained', 'extraItems'];
for (const action of ['preview_soul_path_choose', 'preview_soul_path_switch', 'preview_soul_path_advance', 'preview_soul_path_reroll', 'confirm_soul_path', 'nurture_soul_path', 'set_soul_supply_direction', 'preview_spirit_root_feed', 'promote_spirit_root']) test(`${action}: 真实 Go 预览、原凭证确认及养成回执`, async t => {
  const rows = fixtures.filter(row => row.action === action);
  assert.ok(rows.length > 0, action);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.ok([...body.messageText].length <= 80);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  for (current of rows) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, current.input), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (!result.value.ok) continue;
    const actual = result.value.data as any;
    const data = current.envelope.data.data;
    assert.equal(actual.success, true);
    if (action.startsWith('preview_soul_')) {
      assert.deepEqual(actual.result, { token: data.token, message: data.message, confirmationToken: action === 'preview_soul_path_choose' ? `choose:${data.token}` : data.token });
      assert.ok(fixtures.some(row => row.action === 'confirm_soul_path' && row.input.token === actual.result.confirmationToken), '返回凭证必须可原样用于实际确认');
    } else if (action === 'confirm_soul_path') {
      const kind = data.mode === 'choose' ? 'choose' : data.result.action;
      assert.equal(actual.result.kind, kind);
      if (kind === 'reroll') for (const key of nurtureKeys) assert.deepEqual(actual.result.nurture[key], data.result.nurture[key], key);
      else {
        const path = kind === 'choose' ? data.result : data.result.path;
        for (const key of ['message', 'pathKey', 'pathName', 'nodeName']) assert.equal(actual.result.path[key], path[key]);
        assert.equal(actual.result.path.pathSwitchAvailableAt, path.pathSwitchAvailableAt ?? undefined);
      }
    } else if (action === 'nurture_soul_path') {
      for (const key of [...nurtureKeys, 'dailyNurtureCount', 'dailyNurtureLimit', 'dailyNurtureProgressText', 'usedMonthCardExtra', 'rerollable']) assert.deepEqual(actual.result[key], data[key], key);
    } else if (action === 'set_soul_supply_direction') {
      assert.deepEqual(actual.result, { ...data, direction: data.direction ?? 'auto' });
      assert.equal(actual.result.direction, current.input.direction);
    } else if (action === 'preview_spirit_root_feed') {
      assert.deepEqual(actual.result, data);
      assert.equal(actual.result.requested, 10);
      assert.equal(actual.result.consumed, 1);
      assert.equal(actual.result.pointsAdded, 5);
    } else {
      assert.equal(actual.result.message, data.message);
      assert.equal(actual.result.view.quality, 1);
      assert.equal(actual.result.view.stagePoints, 4);
      for (const key of Object.keys(actual.result.view)) assert.deepEqual(actual.result.view[key], data.view[key], key);
    }
  }
});

const rejected = [...output.matchAll(/ROBOT_SOUL_CONFIRM=(.+)/g)].map(match => JSON.parse(match[1]))
  .filter(row => row.result.success === false && /^(?:choose:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.arguments.token));
test('confirm_soul_path: 真实 Go 过期、状态变化和越权拒绝', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rejected[0];
  assert.ok(current);
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: current.result }) }) }));
  const states = new Set<string>();
  for (current of rejected) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'confirm_soul_path', current.arguments), 'ai-plugin');
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const actual = result.value.data as any;
      assert.equal(actual.success, false);
      assert.equal(actual.result, undefined);
      assert.deepEqual(actual.replies, current.result.middleware.replies);
    }
    states.add(current.state);
  }
  for (const state of ['expired', 'changed', 'foreign']) assert.ok(states.has(state), state);
});

const pathReceipt = { message: '已领悟', pathKey: 'xuan_fa', pathName: '玄法', nodeName: '入门', pathSwitchAvailableAt: null };
const uuid = '12345678-1234-1234-1234-123456789abc';
const nurtureReceipt = { direction: 'wu_dao', directionName: '悟道', tier: 'normal', tierName: '平稳', stabilityBefore: 70, stabilityAfter: 75, insightGained: 2, proficiencyGained: 3, extraItems: [], dailyNurtureCount: 1, dailyNurtureLimit: 3, usedMonthCardExtra: false, dailyNurtureProgressText: '1/3', rerollable: true };
const rootPreview = { itemId: 1, itemName: '清灵草', requested: 10, consumed: 1, pointsAdded: 5, before: 99, after: 104, quality: 0, stageTarget: 100, stageBefore: 99, stageAfter: 104 };
for (const [label, action, input, data] of [
  ['预览UUID非规范', 'preview_soul_path_choose', { pathKey: 'xuan_fa' }, { token: '-'.repeat(36), message: '预览' }],
  ['预览说明缺失', 'preview_soul_path_switch', { pathKey: 'lian_ti' }, { token: uuid, message: ' ' }],
  ['确认类型错配', 'confirm_soul_path', { token: 'choose:' + uuid }, { mode: 'action', result: { action: 'advance', path: pathReceipt } }],
  ['确认节点缺失', 'confirm_soul_path', { token: uuid }, { mode: 'action', result: { action: 'advance', path: { ...pathReceipt, nodeName: '' } } }],
  ['温养次数无效', 'nurture_soul_path', { direction: 'wu_dao' }, { ...nurtureReceipt, dailyNurtureCount: 0 }],
  ['温养方向错配', 'nurture_soul_path', { direction: 'ding_hun' }, nurtureReceipt],
  ['补给方向错配', 'set_soul_supply_direction', { direction: 'auto' }, { direction: 'wu_dao', directionName: '悟道', message: '已设置' }],
  ['灵药预览编号错配', 'preview_spirit_root_feed', { itemId: 2, quantity: 10 }, rootPreview]
] as const) test(`Expose 神魂灵根拒绝损坏回执：${label}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    requests++;
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } }, data } }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(requests, 1);
  assert.equal(result.value.ok, false);
  if (!result.value.ok) assert.equal(result.value.error.outcome, 'unknown');
});
