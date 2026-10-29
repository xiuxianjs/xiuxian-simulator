import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { parseTreasureReceipt } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { invalidPriorityResults, priorityResult, validPriorityResults } from '../helpers/treasure-v5-fixtures';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });
const version = 'treasure-v9-first-guards-merge-20261029';
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const envelope = (result: ReturnType<typeof priorityResult>) => ({ kind: 'explore', operationId: result.operationId, result });

for (const [name, result] of validPriorityResults()) test(`v9成功回执保持单奖契约：${name}`, () => {
  result.rulesVersion = version;
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.rulesVersion, version);
  assert.equal(decoded.result.rewards?.length, result.count);
  assert.equal(decoded.result.experienceGranted, result.count * 100);
});

for (const [name, result] of invalidPriorityResults()) test(`v9仍拒绝异常回执：${name}`, () => {
  if (result.rulesVersion !== 'treasure-future-unknown') result.rulesVersion = version;
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

test('v9兼容保留旧v8成功回执', () => {
  const result = priorityResult(10);
  result.rulesVersion = 'treasure-v8-first-guards-20261029';
  assert.equal(parseTreasureReceipt(envelope(result)).result.rulesVersion, result.rulesVersion);
});

for (const privateChat of [true, false]) test(`v9按服务端全探索单列合同显示，不补造十连概率 private=${privateChat}`, async t => {
  const data = {
    rulesVersion: version,
    serverDate: '2026-10-29',
    balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 10 },
    freeAvailable: true, spiritTenDiscountAvailable: true, totalExplorations: 0, milestoneProgress: 0, pendingSelections: 0,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.2, tenAverageComplete: .12 },
    pity: [],
    wholeRates: [
      { rarity: 4, name: '稀有', probability: .05, scope: 'all_explorations' },
      { rarity: 5, name: '史诗', probability: .021, scope: 'all_explorations' },
      { rarity: 6, name: '神话', probability: .0118, scope: 'all_explorations' }
    ], rules: [], records: []
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const event = privateChat ? app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' });
  const done = await app.runHandler(handler, event);
  assert.equal(done.messages.length, 1);
  assert.equal(done.actions[done.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(done.messages[0].nodes);
  for (const line of ['稀有 综合概率 5%', '史诗 综合概率 2.1%', '神话 综合概率 1.18%']) assert.ok(view.text.includes(line));
  assert.doesNotMatch(view.text, /概率资料未同步|单抽综合概率|十连综合概率|4.058|1.704|0.958/);
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      const row = node as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
      if (row.type === 'MD.button') assert.equal(row.options?.autoEnter, false);
      if (Array.isArray(row.value)) walk(row.value);
    }
  };
  walk(done.messages[0].nodes);
  assert.doesNotMatch(JSON.stringify(done.messages[0].nodes), /"show"\s*:/);
  assert.equal(requests.length, 1);
});

for (const count of [1, 10] as const) test(`真实QQ恢复v9 ${count}次原探索，重试不增加请求次数或奖励`, async t => {
  const result = priorityResult(count);
  result.rulesVersion = version;
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, envelope(result)));
  const event = app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' });
  for (let retry = 0; retry < 2; retry++) {
    const pending = app.runHandler(handler, event);
    const deadline = performance.now() + 3000;
    while (!app.clock.pending && performance.now() < deadline) await nextTurn();
    assert.equal(app.clock.pending, 1);
    await app.clock.advance(3000);
    const done = await pending;
    assert.equal(done.messages.length, 2);
    for (const message of done.messages) assert.equal(done.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(done.messages[1].nodes);
    assert.ok(view.text.includes(`探索 ${count}次`));
    assert.ok(view.text.includes(`宝物经验 +${count * 100}`));
    assert.doesNotMatch(view.text, /尚未获完整确认|暂未取得完整预览|FirstGuard/);
  }
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.path.endsWith('/treasures.confirm') && request.body.arguments && (request.body.arguments as Record<string, unknown>).confirmationRef === confirmationRef));
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
});
