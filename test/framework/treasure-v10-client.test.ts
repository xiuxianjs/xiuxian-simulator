import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });
const output = process.env.TREASURE_V10_CLIENT_FIXTURE_FILE
  ? readFileSync(process.env.TREASURE_V10_CLIENT_FIXTURE_FILE, 'utf8')
  : goTestFixture(['test', './internal/service', '-run', '^TestTreasureActualPity(TenCountsAllTenAndSynthesisNeverResets|ResetInsideTenContinuesRemainingChildren|OverlappingGuaranteesKeepBlockedAges)$', '-v', '-count=1'], {
      cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
    }).toString();
const fixtures = Object.fromEntries([...output.matchAll(/TREASURE_ACTUAL_PITY_CLIENT=([^|]+)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const version = 'treasure-v10-exploration-pity-20261029';
const formatProbability = (value: number) => `${Number((value * 100).toFixed(3))}%`;

for (const [key, viewKey, counters] of [
  ['ten', 'tenOverview', [10, 10, 10]],
  ['midReset', 'midResetOverview', [7, 10, 10]],
  ['overlap0', 'overlapOverview0', [20, 50, 0]],
  ['overlap1', 'overlapOverview1', [21, 0, 1]],
  ['overlap2', 'overlapOverview2', [0, 1, 2]]
] as const) test(`真实Go v10回执与公示 ${key} 保留实际探索计数`, async t => {
  const result = fixtures[key]; const overview = fixtures[viewKey];
  assert.equal(result.rulesVersion, version);
  assert.equal(overview.rulesVersion, version);
  assert.deepEqual(overview.pity.map((pity: { counter: number }) => pity.counter), counters);
  assert.equal(result.rewards.length, result.count);
  assert.equal(result.totalAfter - result.totalBefore, result.count);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.path.endsWith('/treasures.confirm') ? { kind: 'explore', operationId: result.operationId, result } : overview));
  const pending = app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' }));
  const deadline = performance.now() + 3000;
  while (!app.clock.pending && performance.now() < deadline) await nextTurn();
  assert.equal(app.clock.pending, 1); await app.clock.advance(3000);
  const confirmed = await pending;
  assert.equal(confirmed.messages.length, 2);
  for (const message of confirmed.messages) assert.equal(confirmed.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const rewardText = inspectMessage(confirmed.messages[1].nodes).text;
  assert.ok(rewardText.includes(`探索 ${result.count}次`));
  assert.ok(rewardText.includes(`宝物经验 +${result.count * 100}`));
  assert.doesNotMatch(rewardText, /结果尚未获完整确认|暂未取得完整预览/);
  const page = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
  assert.equal(page.messages.length, 1);
  assert.equal(page.actions[page.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(page.messages[0].nodes);
  assert.match(view.text, /非保底基础整品概率12%/);
  assert.match(view.text, /保底按实际探索累计/);
  for (const pity of overview.pity) assert.ok(view.text.includes(`保底(${pity.counter}/${pity.hardPity})`));
  for (const rate of overview.wholeRates) {
    assert.ok(view.text.includes(`单抽综合概率 ${formatProbability(rate.probability)}`));
    assert.ok(view.text.includes(`十连综合概率 ${formatProbability(rate.tenProbability)}`));
  }
  const waiting = overview.pity.filter((pity: { counter: number; hardPity: number }) => pity.counter >= pity.hardPity).length;
  assert.equal(view.text.match(/已到保底／高档优先待发/g)?.length ?? 0, waiting);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      const node = raw as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
      if (node.type === 'MD.button') assert.equal(node.options?.autoEnter, false);
      if (Array.isArray(node.value)) walk(node.value);
    }
  };
  walk(page.messages[0].nodes);
  assert.doesNotMatch(JSON.stringify(page.messages[0].nodes), /"show"\s*:/);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].body.arguments, { confirmationRef });
  if (key === 'overlap0' && process.env.TREASURE_V10_PREVIEW_OUTPUT) writeFileSync(process.env.TREASURE_V10_PREVIEW_OUTPUT, JSON.stringify({ text: view.text, commands: view.commands, nodes: page.messages[0].nodes }, null, 2));
});
