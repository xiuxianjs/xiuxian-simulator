import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { parseRelicsOverview, parseTreasureReceipt } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';
import { independentResult, invalidIndependentResults, validIndependentResults } from '../helpers/treasure-v4-fixtures';

let historicalPreview = '';
after(async () => {
  if (process.env.TREASURE_V4_PREVIEW_OUTPUT) writeFileSync(process.env.TREASURE_V4_PREVIEW_OUTPUT, historicalPreview, 'utf8');
  await shutdownLogger();
});
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const envelope = (result: ReturnType<typeof independentResult>) => ({ kind: 'explore', operationId: result.operationId, result });

for (const [name, result] of validIndependentResults()) test(`v4有效回执：${name}`, () => {
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.count, result.count);
  assert.equal(decoded.result.experienceGranted, result.count * 100);
  assert.equal(decoded.result.rewards?.length, result.rewards.length);
  assert.deepEqual(decoded.result.rewards?.map(item => item.pullIndex), result.rewards.map(item => item.pullIndex));
});
for (const [name, result] of invalidIndependentResults()) test(`v4拒绝异常回执：${name}`, () => {
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

test('旧v3无pullIndex的已成功回执仍可解析', () => {
  const result = independentResult();
  result.rulesVersion = 'treasure-v3-complete-20261027';
  result.rewards = result.rewards.slice(0, 1);
  delete result.rewards[0].pullIndex;
  assert.equal(parseTreasureReceipt(envelope(result)).result.rewards?.length, 1);
});

for (const scope of ['direct_complete_result', 'direct_complete_decision']) test(`概率公示兼容${scope}且不归一化独立多奖概率`, () => {
  const rates = [.5137410687568716, .2568705343784358, .1284352671892179, .06545702576647949, .02649495361282346, .0118];
  const data = parseRelicsOverview({
    serverDate: '2026-10-29', balances: { spiritCrystal: 0, daoCrystal: 0, treasureMaps: 0 }, freeAvailable: true,
    spiritTenDiscountAvailable: true, totalExplorations: 0, milestoneProgress: 0, pendingSelections: 0,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [{ rarity: 6, name: '神话', counter: 0, hardPity: 120, nextProbability: .002, conditionalProbability: .02, scope }],
    wholeRates: rates.map((probability, i) => ({ rarity: i + 1, name: ['普通', '优秀', '精良', '稀有', '史诗', '神话'][i], probability, scope })),
    rules: [], records: []
  });
  assert.equal(data.pity[0].conditionalProbability, .02);
  assert.equal(data.pity[0].nextProbability, .002);
  assert.deepEqual(data.wholeRates.map(rate => rate.probability), rates);
  assert.ok(data.wholeRates.reduce((sum, rate) => sum + rate.probability, 0) > 1);
});

for (const count of [1, 10] as const) test(`历史v4 ${count}次探索多本体原回执可恢复，经验按原探索次数且确认可重放`, async t => {
  const result = independentResult(count);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, envelope(result)));
  const event = app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' });
  for (let attempt = 0; attempt < 2; attempt++) {
    const pending = app.runHandler(handler, event);
    const deadline = performance.now() + 2000;
    while (!app.clock.pending && performance.now() < deadline) await nextTurn();
    assert.equal(app.clock.pending, 1);
    await app.clock.advance(3000);
    const done = await pending;
    assert.equal(done.messages.length, 2);
    for (const message of done.messages) assert.equal(done.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const [story, receipt] = done.messages.map(message => inspectMessage(message.nodes));
    assert.match(story.text, /你踏尽四海八荒/);
    assert.match(receipt.text, new RegExp(`探索 ${count}次.*宝物经验 \\+${count * 100}`));
    for (const name of ['九天息壤', '万木春符', '采薇竹篮']) assert.match(receipt.text, new RegExp(`⭐ ${name} · 本体 ×1`));
    if (count === 1 && attempt === 0) historicalPreview = `## 历史 v4 已结算回执恢复（单次三本体）\n\n以下为旧v4成功订单的兼容恢复示例；当前v5每次探索只返回一条奖励，不会按本例新增三件本体。两条消息来自真实处理器离线输出，恢复仅核对原操作。\n\n第一条消息：\n\n${story.text}\n\n等待3秒后，第二条消息：\n\n${receipt.text}\n\n所有按钮均为手动发送（autoEnter:false）。\n`;
    assert.equal(receipt.commands.filter(command => command.startsWith('/宝物 详情 ')).length, result.rewards.length);
    assert.equal(requests.length, attempt + 1);
  }
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
  for (const request of requests) { assert.ok(request.path.endsWith('/treasures.confirm')); assert.deepEqual(request.body.arguments, { confirmationRef }); }
});

test('v4同序号重复高档拒绝展示成功，保留原确认引用', async t => {
  const result = independentResult();
  result.rewards[1] = { ...result.rewards[0] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, envelope(result)));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' }));
  assert.equal(done.messages.length, 1);
  assert.equal(done.actions[done.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(done.messages[0].nodes);
  assert.match(view.text, /结果尚未获完整确认/);
  assert.ok(view.commands.includes(`/确认宝物 ${confirmationRef}`));
  assert.equal(app.clock.pending, 0);
  assert.equal(requests.length, 1);
});
