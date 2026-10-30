import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseTreasureReceipt } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { invalidPriorityResults, priorityResult, validPriorityResults } from '../helpers/treasure-v5-fixtures';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });
const version = 'treasure-v10-exploration-pity-20261029';
const expandedPool = 'treasure-36-v2';
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const envelope = (result: ReturnType<typeof priorityResult> & { poolVersion?: string }) => ({ kind: 'explore', operationId: result.operationId, result });

for (const id of [105, 106, 205, 206, 305, 306, 405, 406, 505, 506, 605, 606]) test(`36件目录接受新编号${id}回执并保留pool`, () => {
  const result = { ...priorityResult(), rulesVersion: version, poolVersion: expandedPool };
  result.rewards[0] = { ...result.rewards[0], treasureId: id, rarity: Math.floor(id / 100), name: `宝物${id}` };
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.rewards?.[0].treasureId, id);
  assert.equal(decoded.result.poolVersion, expandedPool);
  for (const poolVersion of [undefined, 'treasure-24-v1', 'treasure-future-unknown']) {
    assert.throws(() => parseTreasureReceipt(envelope({ ...result, poolVersion })), { code: 'SDK_INVALID_RESPONSE' });
  }
});

for (const id of [107, 607, 700]) test(`36件目录仍拒绝非法编号${id}`, () => {
  const result = { ...priorityResult(), rulesVersion: version, poolVersion: expandedPool };
  result.rewards[0] = { ...result.rewards[0], treasureId: id, rarity: Math.floor(id / 100) };
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

for (const id of [105, 106, 205, 206, 305, 306, 405, 406, 505, 506, 605, 606]) test(`QQ培养命令接受新编号${id}且链接手动发送`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    kind: 'upgrade', summary: ['培养预览'], confirmationRef, operationId: 'expanded-preview', expiresAt: '2026-11-01T00:00:00+08:00'
  }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: `/宝物 升级 ${id}`, platform: 'qq-bot' }));
  delivered(result);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.arguments, { kind: 'upgrade', treasureId: id });
});

function overview(counters = [2, 3, 4]) {
  return {
    rulesVersion: version, serverDate: '2026-10-30', balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 10 },
    freeAvailable: true, spiritTenDiscountAvailable: true, totalExplorations: 305, milestoneProgress: 5, pendingSelections: 1,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [4, 5, 6].map((rarity, index) => ({ rarity, name: ['稀有', '史诗', '神话'][index], counter: counters[index], hardPity: [20, 50, 120][index], nextProbability: .1, scope: 'actual_exploration' })),
    // Display contract fixture only; final calibrated rates remain server-owned.
    wholeRates: [4, 5, 6].map((rarity, index) => ({ rarity, name: ['稀有', '史诗', '神话'][index], probability: [0.05831489604623336,0.027370821251023334,0.011425216549562127][index], tenProbability: [0.05985610813677853,0.028666561152853553,0.011799999999972322][index], scope: 'all_explorations_by_mode' })),
    rules: [], records: []
  };
}

function delivered(result: TestRunResult) {
  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const walk = (nodes: unknown[]) => {
      for (const raw of nodes) {
        const node = raw as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
        if (node.type === 'MD.button') assert.equal(node.options?.autoEnter, false);
        if (Array.isArray(node.value)) walk(node.value);
      }
    };
    walk(message.nodes);
    assert.doesNotMatch(JSON.stringify(message.nodes), /"show"\s*:/);
  }
  return result.messages.map(message => inspectMessage(message.nodes));
}

for (const [name, result] of validPriorityResults()) test(`v10仍接受单奖严格回执 ${name}`, () => {
  result.rulesVersion = version;
  assert.equal(parseTreasureReceipt(envelope(result)).result.rulesVersion, version);
});
for (const [name, result] of invalidPriorityResults()) test(`v10仍拒绝异常回执 ${name}`, () => {
  if (result.rulesVersion !== 'treasure-future-unknown') result.rulesVersion = version;
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});
for (const oldVersion of ['treasure-v5-priority-20261029', 'treasure-v6-shape12-20261029', 'treasure-v7-v5-shape12-20261029', 'treasure-v8-first-guards-20261029', 'treasure-v9-first-guards-merge-20261029']) test(`v10保留${oldVersion}成功回执`, () => {
  const result = priorityResult(10); result.rulesVersion = oldVersion;
  assert.equal(parseTreasureReceipt(envelope(result)).result.rulesVersion, oldVersion);
});

for (const privateChat of [true, false]) test(`v10实际探索计数与两列概率直接读取服务端 private=${privateChat}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview([0, 49, 119])));
  const event = privateChat ? app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' });
  const result = await app.runHandler(handler, event);
  const [view] = delivered(result);
  assert.match(view.text, /保底按实际探索累计/);
  assert.match(view.text, /非保底基础整品概率12%/);
  assert.match(view.text, /十连至少一件整品/);
  assert.doesNotMatch(view.text, /单抽出整品概率/);
  for (const line of ['保底(0/20)', '保底(49/50)', '保底(119/120)', '单抽综合概率 5.831%', '十连综合概率 5.986%']) assert.ok(view.text.includes(line), line);
  assert.doesNotMatch(view.text, /完整本体判定累计|旧规则/);
  assert.equal(requests.length, 1);
});

for (const mode of ['old-scope', 'missing-scope', 'counter-past-retention', 'missing-rarity', 'duplicate-rarity']) test(`v10计数${mode}不得冒用实际探索口径`, async t => {
  const data = overview();
  if (mode === 'old-scope') data.pity[0].scope = 'direct_complete_decision';
  if (mode === 'missing-scope') delete (data.pity[0] as { scope?: string }).scope;
  if (mode === 'counter-past-retention') data.pity[0].counter = data.pity[0].hardPity + 4;
  if (mode === 'missing-rarity') data.pity.pop();
  if (mode === 'duplicate-rarity') data.pity[0].rarity = 5;
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const [view] = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' })));
  assert.match(view.text, /概率资料未同步，请稍后刷新/);
  assert.doesNotMatch(view.text, /保底按实际探索累计|保底\(\d/);
});

for (const extra of [0, 1, 2, 3]) test(`v10超过到期阈值H+${extra}时保留真实计数并说明待发`, async t => {
  const data = overview([20 + extra, 50 + extra, 120 + extra]);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const [view] = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' })));
  for (const line of [`保底(${20 + extra}/20)`, `保底(${50 + extra}/50)`, `保底(${120 + extra}/120)`]) assert.ok(view.text.includes(line));
  assert.equal(view.text.match(/已到保底／高档优先待发/g)?.length, 3);
  assert.doesNotMatch(view.text, /概率资料未同步|保底信息暂未同步/);
});

test('v10十连只有1直接本体9碎片后，刷新读取服务端三档各推进10而不本地推算', async t => {
  let current = overview();
  const result = priorityResult(10); result.rulesVersion = version;
  result.rewards = Array.from({ length: 10 }, (_, index) => ({ treasureId: 101, name: '锈剑残片', rarity: 1, kind: index === 0 ? 'body' : 'fragment', quantity: 1, newlyOwned: index === 0, pullIndex: index + 1, autoSynthesized: 0, fragmentsRemaining: 0, forcedComplete: false }));
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/treasures.confirm')) { current = overview([12, 13, 14]); return businessEnvelope(request.bid, envelope(result)); }
    return businessEnvelope(request.bid, current);
  });
  const query = () => app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  assert.match(delivered(await query())[0].text, /保底\(2\/20\)/);
  const pending = app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' }));
  const deadline = performance.now() + 3000;
  while (!app.clock.pending && performance.now() < deadline) await nextTurn();
  assert.equal(app.clock.pending, 1); await app.clock.advance(3000);
  const confirmed = delivered(await pending);
  assert.equal(confirmed.length, 2);
  assert.match(confirmed[1].text, /探索 10次.*宝物经验 \+1000/);
  const after = delivered(await query())[0];
  for (const text of ['保底(12/20)', '保底(13/50)', '保底(14/120)']) assert.ok(after.text.includes(text));
  current = overview([0, 49, 119]);
  const authoritative = delivered(await query())[0];
  for (const text of ['保底(0/20)', '保底(49/50)', '保底(119/120)']) assert.ok(authoritative.text.includes(text));
  assert.equal(requests.filter(request => request.path.endsWith('/treasures.confirm')).length, 1);
  assert.deepEqual(requests.find(request => request.path.endsWith('/treasures.confirm'))!.body.arguments, { confirmationRef });
});
