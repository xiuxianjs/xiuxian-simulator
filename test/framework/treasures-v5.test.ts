import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { parseTreasureReceipt } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';
import { priorityResult, invalidPriorityResults, validPriorityResults } from '../helpers/treasure-v5-fixtures';

after(async () => { await shutdownLogger(); });
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const envelope = (result: ReturnType<typeof priorityResult>) => ({ kind: 'explore', operationId: result.operationId, result });
for (const [name, result] of validPriorityResults()) test(`v5有效回执：${name}`, () => {
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.rewards?.length, result.count);
  assert.equal(decoded.result.experienceGranted, result.count * 100);
  assert.deepEqual(decoded.result.rewards?.map(item => item.pullIndex), result.rewards.map(item => item.pullIndex));
});
for (const [name, result] of invalidPriorityResults()) test(`v5拒绝异常回执：${name}`, () => {
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

for (const mode of ['duplicate-index', 'unknown-version']) test(`v5 ${mode}保留原引用，核对原成功回执后只展示一本体`, async t => {
  const valid = priorityResult(10);
  const invalid = priorityResult(10);
  if (mode === 'duplicate-index') invalid.rewards[0].pullIndex = 2;
  else invalid.rulesVersion = 'treasure-future-unknown';
  let first = true;
  const { app, requests } = await gameFixture(t, request => { const data = first ? invalid : valid; first = false; return businessEnvelope(request.bid, envelope(data)); });
  const event = app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' });
  const refused = await app.runHandler(handler, event);
  assert.equal(refused.messages.length, 1);
  const recovery = inspectMessage(refused.messages[0].nodes);
  assert.ok(recovery.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.match(recovery.text, /结果尚未获完整确认/);
  assert.equal(app.clock.pending, 0);
  const pending = app.runHandler(handler, event);
  const deadline = performance.now() + 2000;
  while (!app.clock.pending && performance.now() < deadline) await nextTurn();
  assert.equal(app.clock.pending, 1);
  await app.clock.advance(3000);
  const done = await pending;
  assert.equal(done.messages.length, 2);
  for (const message of done.messages) assert.equal(done.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const [story, result] = done.messages.map(message => inspectMessage(message.nodes));
  assert.match(story.text, /你踏尽四海八荒/);
  assert.match(result.text, /探索 10次.*宝物经验 \+1000/);
  assert.doesNotMatch(result.text, /完整池|完整判定|推进|形态|保底|不计直接完整/);
  assert.equal(result.text.match(/⭐ .* · 本体 ×1/g)?.length, 1);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
  assert.ok(requests.every(request => request.path.endsWith('/treasures.confirm')));
});

for (const legacySix of [false, true]) test(`概率只显示服务端高三档实际值，兼容旧六档=${legacySix}`, async t => {
  const rates = [{ rarity: 4, name: '稀有', probability: .073 }, { rarity: 5, name: '史诗', probability: .024 }, { rarity: 6, name: '神话', probability: .019 }];
  const wholeRates = (legacySix ? [...[1, 2, 3].map((rarity, i) => ({ rarity, name: ['普通', '优秀', '精良'][i], probability: .1 })), ...rates] : rates).map(rate => ({ ...rate, scope: 'all_explorations' }));
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    rulesVersion: 'treasure-v5-priority-20261029',
    serverDate: '2026-10-29', balances: { spiritCrystal: 0, daoCrystal: 0, treasureMaps: 0 }, freeAvailable: true,
    spiritTenDiscountAvailable: true, totalExplorations: 0, milestoneProgress: 0, pendingSelections: 0,
    shapeRates: { singleComplete: .1478500976009402, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [], wholeRates, rules: ['隐藏计数机制不展示'], records: []
  }));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  assert.equal(done.messages.length, 1);
  assert.equal(done.actions[done.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(done.messages[0].nodes);
  for (const row of ['稀有 综合概率 7.3%', '史诗 综合概率 2.4%', '神话 综合概率 1.9%']) assert.ok(view.text.includes(row));
  assert.equal(view.text.match(/ 综合概率 /g)?.length, 3);
  assert.doesNotMatch(view.text, /普通|优秀|精良|完整|形态|保底|计数|隐藏|累计|14.785/);
});

for (const mode of ['old-version', 'missing-version', 'old-scope', 'missing-scope']) test(`概率口径${mode}不以旧条件率冒充所有探索综合率，保留刷新导航`, async t => {
  const rulesVersion = mode === 'missing-version' ? undefined : mode === 'old-version' ? 'treasure-v4-independent-20261029' : 'treasure-v5-priority-20261029';
  const scope = mode === 'missing-scope' ? undefined : mode === 'old-scope' ? 'direct_complete_decision' : 'all_explorations';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    rulesVersion, serverDate: '2026-10-29', balances: { spiritCrystal: 0, daoCrystal: 0, treasureMaps: 0 }, freeAvailable: true,
    spiritTenDiscountAvailable: true, totalExplorations: 0, milestoneProgress: 0, pendingSelections: 0,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [], wholeRates: [4, 5, 6].map((rarity, i) => ({ rarity, name: ['稀有', '史诗', '神话'][i], probability: [.065457, .02649, .0118][i], scope })), rules: [], records: []
  }));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  const view = inspectMessage(done.messages[0].nodes);
  assert.match(view.text, /概率资料未同步/);
  assert.doesNotMatch(view.text, /%|完整|形态|保底|综合概率/);
  for (const command of ['/上古遗珍 概率', '/上古遗珍', '/宝物']) assert.ok(view.commands.includes(command));
  const normal = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' }));
  assert.match(inspectMessage(normal.messages[0].nodes).text, /当前账户/);
  assert.equal(requests.length, 2);
});

test('探索记录保留本体、碎片、合成余片与费用，不显示隐藏形态说明', async t => {
  const result = priorityResult(10);
  Object.assign(result.rewards[0], { quantity: 2, autoSynthesized: 1, fragmentsRemaining: 1 });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    serverDate: '2026-10-29', balances: { spiritCrystal: 0, daoCrystal: 0, treasureMaps: 0 }, freeAvailable: true,
    spiritTenDiscountAvailable: true, totalExplorations: 10, milestoneProgress: 10, pendingSelections: 0,
    shapeRates: { singleComplete: .1478500976009402, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [], wholeRates: [], rules: [], records: [{ ...result, createdAt: '2026-10-29T10:00:00+08:00' }]
  }));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 记录', platform: 'qq-bot' }));
  assert.equal(done.messages.length, 1);
  assert.equal(done.actions[done.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(done.messages[0].nodes);
  assert.match(view.text, /九天息壤本体 ×1/);
  assert.match(view.text, /锈剑残片碎片 ×2/);
  assert.match(view.text, /自动合成1本体，余片1/);
  assert.match(view.text, /消耗 10800/);
  assert.doesNotMatch(view.text, /完整池|完整判定|直接完整|形态|保底/);
});
