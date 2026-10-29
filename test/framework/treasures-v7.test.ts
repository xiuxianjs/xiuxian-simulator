import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { parseRelicsOverview, parseTreasureReceipt } from '../../src/api/bot/treasures';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';
import { invalidPriorityResults, priorityResult, validPriorityResults } from '../helpers/treasure-v5-fixtures';

after(async () => { await shutdownLogger(); });
const version = 'treasure-v7-v5-shape12-20261029';
const envelope = (result: ReturnType<typeof priorityResult>) => ({ kind: 'explore', operationId: result.operationId, result });

function overview() {
  return {
    rulesVersion: version,
    serverDate: '2026-10-29',
    balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 10 },
    freeAvailable: true,
    spiritTenDiscountAvailable: true,
    totalExplorations: 305,
    milestoneProgress: 5,
    pendingSelections: 1,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [
      { rarity: 4, name: '稀有', counter: 13, hardPity: 20, nextProbability: .05 },
      { rarity: 5, name: '史诗', counter: 28, hardPity: 50, nextProbability: .2 },
      { rarity: 6, name: '神话', counter: 119, hardPity: 120, nextProbability: 1 }
    ],
    wholeRates: [
      { rarity: 4, name: '稀有', probability: .04058164382274883, tenProbability: .05, scope: 'all_explorations_by_mode' },
      { rarity: 5, name: '史诗', probability: .017044290405554594, tenProbability: .021, scope: 'all_explorations_by_mode' },
      { rarity: 6, name: '神话', probability: .009577267942168708, tenProbability: .0118, scope: 'all_explorations_by_mode' }
    ],
    rules: ['内部完整判定和保底条件不展示'],
    records: []
  };
}

for (const [name, result] of validPriorityResults()) test(`v7有效回执：${name}`, () => {
  result.rulesVersion = version;
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.rulesVersion, version);
  assert.equal(decoded.result.rewards?.length, result.count);
  assert.equal(decoded.result.experienceGranted, result.count * 100);
});

for (const [name, result] of invalidPriorityResults()) test(`v7拒绝异常回执：${name}`, () => {
  if (result.rulesVersion !== 'treasure-future-unknown') result.rulesVersion = version;
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

for (const oldVersion of ['treasure-v5-priority-20261029', 'treasure-v6-shape12-20261029']) test(`v7继续解析${oldVersion}成功回执`, () => {
  const result = priorityResult(10);
  result.rulesVersion = oldVersion;
  assert.equal(parseTreasureReceipt(envelope(result)).result.rulesVersion, oldVersion);
});

test('v7 API解码保留单抽与十连各自概率', () => {
  const decoded = parseRelicsOverview(overview());
  assert.deepEqual(decoded.wholeRates.map(rate => [rate.probability, rate.tenProbability, rate.scope]), [
    [.04058164382274883, .05, 'all_explorations_by_mode'],
    [.017044290405554594, .021, 'all_explorations_by_mode'],
    [.009577267942168708, .0118, 'all_explorations_by_mode']
  ]);
});

for (const value of [-.01, Number.NaN, Number.POSITIVE_INFINITY]) test(`v7拒绝非法十连概率${value}`, () => {
  const data = overview();
  data.wholeRates[0].tenProbability = value;
  assert.throws(() => parseRelicsOverview(data), { code: 'SDK_INVALID_RESPONSE' });
});

for (const pageVersion of [version, 'treasure-v8-first-guards-20261029']) for (const privateChat of [true, false]) test(`${pageVersion}真实QQ概率页分列两种综合概率 private=${privateChat}`, async t => {
  const data = overview();
  data.rulesVersion = pageVersion;
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const event = privateChat
    ? app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' })
    : app.events.groupMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' });
  const done = await app.runHandler(handler, event);
  assert.equal(done.messages.length, 1);
  assert.equal(done.actions[done.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(done.messages[0].nodes);
  assert.ok(view.text.includes('上古遗珍\n\n综合概率\n\n'));
  for (const text of ['单抽综合概率 4.058%', '单抽综合概率 1.704%', '单抽综合概率 0.958%', '十连综合概率 5%', '十连综合概率 2.1%', '十连综合概率 1.18%', '保底(13/20)', '保底(28/50)', '保底(119/120)']) {
    assert.ok(view.text.includes(text), text);
  }
  assert.doesNotMatch(view.text, /完整判定|完整池|条件概率|下一次|累计探索|本轮|首件|FirstGuard/);
  assert.match(view.text, /单抽出整品概率12%/);
  assert.match(view.text, /十连至少出一件整品/);
  assert.ok(view.text.indexOf('单抽出整品概率12%') < view.text.indexOf('十连至少出一件整品'));
  assert.ok(view.text.indexOf('十连至少出一件整品') < view.text.indexOf('单抽综合概率'));
  assert.deepEqual(view.commands, ['/宝物', '/上古遗珍', '/充值 灵脉租契']);
  const nodes = done.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const blocks = nodes.filter(node => node.type === 'MD.blockquote');
  assert.equal(blocks.length, 3);
  for (const [index, name] of ['稀有', '史诗', '神话'].entries()) {
    const block = blocks[index];
    assert.ok(Array.isArray(block.value));
    assert.deepEqual(block.value.filter(node => node.type === 'MD.bold').map(node => node.value), [name]);
    const lines = block.value.filter(node => node.type === 'MD.text').map(node => node.value);
    assert.deepEqual(lines, [
      `单抽综合概率 ${['4.058%', '1.704%', '0.958%'][index]}`,
      `十连综合概率 ${['5%', '2.1%', '1.18%'][index]}`,
      `保底(${['13/20', '28/50', '119/120'][index]})`
    ]);
  }
  for (const node of nodes) if (node.type === 'MD.button') assert.equal(node.options?.autoEnter, false);
  assert.doesNotMatch(JSON.stringify(nodes), /"show"\s*:/);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/ancient-relics.overview'));
  if (privateChat && process.env.TREASURE_V7_PREVIEW_OUTPUT) {
    writeFileSync(process.env.TREASURE_V7_PREVIEW_OUTPUT, JSON.stringify({ text: view.text, commands: view.commands, nodes: done.messages[0].nodes }, null, 2), 'utf8');
  }
});

test('v7保底显示读取服务端实际计数，缺失档位不伪造进度', async t => {
  const data = overview();
  data.pity[0].counter = 7;
  data.pity[1].counter = 49;
  data.pity = data.pity.filter(pity => pity.rarity !== 6);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  const view = inspectMessage(done.messages[0].nodes);
  assert.match(view.text, /保底\(7\/20\)/);
  assert.match(view.text, /保底\(49\/50\)/);
  assert.match(view.text, /保底信息暂未同步/);
  assert.doesNotMatch(view.text, /13\/20|28\/50|119\/120/);
});

for (const mode of ['missing-ten', 'overflow-ten', 'old-scope', 'old-version']) test(`v7概率${mode}时请求刷新，不冒用单列口径`, async t => {
  const data: Omit<ReturnType<typeof overview>, 'wholeRates'> & { wholeRates: Array<{ rarity: number; name: string; probability: number; tenProbability?: number; scope: string }> } = overview();
  if (mode === 'missing-ten') delete data.wholeRates[0].tenProbability;
  if (mode === 'overflow-ten') data.wholeRates[0].tenProbability = 1.01;
  if (mode === 'old-scope') data.wholeRates[0].scope = 'all_explorations';
  if (mode === 'old-version') data.rulesVersion = 'treasure-v6-shape12-20261029';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const done = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  const view = inspectMessage(done.messages[0].nodes);
  assert.match(view.text, /概率资料未同步，请稍后刷新/);
  assert.doesNotMatch(view.text, /4.058%|1.704%|0.958%/);
  assert.ok(view.commands.includes('/上古遗珍 概率'));
});
