import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { mythicDispersionRulesVersion, parseRelicsOverview, parseTreasureReceipt } from '../../src/api/bot/treasures';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import handler from '../../src/response/treasures/res';
import { invalidPriorityResults, validPriorityResults } from '../helpers/treasure-v5-fixtures';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });

// Display contract fixture only; published probability values remain server-owned.
function overview(stage = 1, counter = 84) {
  return {
    rulesVersion: mythicDispersionRulesVersion, poolVersion: 'treasure-36-dispersion-v4',
    serverDate: '2026-11-08', balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 10 },
    freeAvailable: true, spiritTenDiscountAvailable: true, spiritTenCost: 6000, daoTenDiscountAvailable: true, daoTenCost: 60,
    totalExplorations: 305, milestoneProgress: 5, pendingSelections: 1,
    shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
    pity: [4, 5, 6].map((rarity, index) => ({
      rarity, name: ['稀有', '史诗', '神话'][index], counter: rarity === 6 ? counter : index + 2,
      hardPity: [20, 50, 120][index], nextProbability: rarity === 6 ? .51234 : .1, scope: 'actual_exploration',
      dispersionStage: rarity === 6 ? stage : 0,
      softPityStart: rarity === 6 ? (stage === 1 ? 80 : stage === 2 ? 50 : 0) : 0,
      softPityEnd: rarity === 6 ? (stage === 1 ? 90 : stage === 2 ? 60 : 0) : 0,
      effectiveHardPity: rarity === 6 ? (stage === 1 ? 90 : stage === 2 ? 60 : 120) : [20, 50][index]
    })),
    wholeRates: [4, 5, 6].map((rarity, index) => ({
      rarity, name: ['稀有', '史诗', '神话'][index],
      probability: [0.058447569035943066, 0.0274790394882373, 0.012364912134866981][index],
      tenProbability: [0.059943472816176534, 0.028732347856951453, 0.012526670689700203][index],
      scope: 'all_explorations_by_mode'
    })),
    rules: [], records: []
  };
}

function delivered(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
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
  return inspectMessage(result.messages[0].nodes);
}

for (const [name, fixture] of validPriorityResults()) test(`v11接受${name}并保留36件回执`, () => {
  const result = { ...fixture, rulesVersion: mythicDispersionRulesVersion, poolVersion: 'treasure-36-dispersion-v4' };
  assert.equal(parseTreasureReceipt({ kind: 'explore', operationId: result.operationId, result }).result.rulesVersion, mythicDispersionRulesVersion);
  assert.throws(() => parseTreasureReceipt({ kind: 'explore', operationId: result.operationId, result: { ...result, rulesVersion: 'treasure-v10-exploration-pity-20261029' } }), { code: 'SDK_INVALID_RESPONSE' });
});
for (const [name, fixture] of invalidPriorityResults()) test(`v11拒绝${name}`, () => {
  const result = { ...fixture, rulesVersion: fixture.rulesVersion === 'treasure-future-unknown' ? fixture.rulesVersion : mythicDispersionRulesVersion };
  assert.throws(() => parseTreasureReceipt({ kind: 'explore', operationId: result.operationId, result }), { code: 'SDK_INVALID_RESPONSE' });
});

for (const [stage, counter, cap] of [[0, 14, 120], [1, 84, 90], [2, 54, 60], [2, 100, 60], [0, 120, 120]]) {
  for (const privateChat of [true, false]) test(`v11阶段${stage}计数${counter}展示固定神话保底 private=${privateChat}`, async t => {
    const data = overview(stage, counter);
    if (counter >= cap) data.pity[2].nextProbability = 1;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = privateChat ? app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' });
    const view = delivered(await app.runHandler(handler, event));
    assert.ok(view.text.includes(`保底(${counter}/120)`));
    assert.equal(view.text.includes('已到保底／高档优先待发'), counter >= 120);
    assert.doesNotMatch(view.text, /已达当前保底|保底\(\d+\/(?:60|90)\)/);
    assert.match(view.text, /保底按实际探索累计/);
    assert.ok(view.text.includes('单抽综合概率 1.236%'));
    assert.ok(view.text.includes('十连综合概率 1.253%'));
    assert.doesNotMatch(view.text, /第[二三]轮|平滑|最多还需|下次单抽神话概率|下次探索必出/);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/ancient-relics.overview'));
  });
}

test('v11旧版和公示响应生成相同的公开保底信息', () => {
  const legacy = overview(1, 84);
  const published = overview(0, 84);
  const withoutPrivateFields = {
    ...published,
    pity: published.pity.map(({ rarity, name, counter, hardPity, scope }) => ({ rarity, name, counter, hardPity, scope }))
  };
  const expected = [
    { rarity: 4, name: '稀有', counter: 2, hardPity: 20, scope: 'actual_exploration' },
    { rarity: 5, name: '史诗', counter: 3, hardPity: 50, scope: 'actual_exploration' },
    { rarity: 6, name: '神话', counter: 84, hardPity: 120, scope: 'actual_exploration' }
  ];

  for (const data of [legacy, published, withoutPrivateFields]) {
    assert.deepEqual(parseRelicsOverview(data).pity, expected);
  }
});

test('v11仍拒绝无效的公开保底计数', () => {
  const data = overview();
  data.pity[2].counter = -1;
  assert.throws(() => parseRelicsOverview(data), { code: 'SDK_INVALID_RESPONSE' });
});

test('旧服务端的动态保底数据不会透传到机器人查询或回执', async t => {
  const pity = overview(2, 54);
  const result = {
    ...validPriorityResults()[0][1],
    rulesVersion: mythicDispersionRulesVersion,
    poolVersion: 'treasure-36-dispersion-v4',
    pulls: [{ index: 1, dispersionStageBefore: 2, dispersionStageAfter: 1, dispersionProbability: .6, dispersionHit: true }]
  };
  const { app } = await gameFixture(t, request => {
    if (request.path.endsWith('/ancient-relics.overview')) return businessEnvelope(request.bid, pity);
    const receipt = { kind: 'explore', operationId: result.operationId, result };

    return businessEnvelope(request.bid, request.path.endsWith('/treasures.operation-status') ? { ...receipt, status: 'completed' } : receipt);
  });
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const read = (action: string, input: Record<string, string>) =>
    app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');

  const display = await read('get_ancient_relics', {});
  assert.equal(display.value.ok, true, JSON.stringify(display.value));
  assert.doesNotMatch(JSON.stringify(display.value), /dispersionStage|effectiveHardPity|softPity|nextProbability/);
  const status = await read('get_treasure_operation_status', { operationId: result.operationId });
  const receipt = await read('confirm_treasure_action', { confirmationRef: 'r1_1_b_mh9of000_0123456789abcdef01234567' });
  for (const response of [status, receipt]) {
    assert.equal(response.value.ok, true, JSON.stringify(response.value));
    assert.doesNotMatch(JSON.stringify(response.value), /dispersionStage|dispersionProbability|dispersionHit/);
  }
});

test('v10旧响应允许缺少保护字段，v11提供真实消息节点预览', async t => {
  let current = overview();
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, current));
  const pages: Record<string, unknown> = {};
  for (const [key, stage, counter] of [['before', 0, 84], ['after', 1, 84]] as const) {
    current = overview(stage, counter);
    if (key === 'before') {
      current.rulesVersion = 'treasure-v10-exploration-pity-20261029';
      current.poolVersion = 'treasure-36-maxed-v3';
      current.wholeRates.forEach((rate, index) => {
        rate.probability = [0.05831489604623336, 0.027370821251023334, 0.011425216549562127][index];
        rate.tenProbability = [0.05985610813677853, 0.028666561152853553, 0.011799999999972322][index];
      });
      for (const pity of current.pity) {
        delete (pity as Partial<typeof pity>).dispersionStage;
        delete (pity as Partial<typeof pity>).softPityStart;
        delete (pity as Partial<typeof pity>).softPityEnd;
        delete (pity as Partial<typeof pity>).effectiveHardPity;
      }
    }
    const result = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍 概率', platform: 'qq-bot' }));
    const view = delivered(result);
    pages[key] = { text: view.text, commands: view.commands, nodes: result.messages[0].nodes };
    if (key === 'before') assert.doesNotMatch(view.text, /第[二三]轮保护/);
    const homeResult = await app.runHandler(handler, app.events.privateMessage({ text: '/上古遗珍', platform: 'qq-bot' }));
    const home = delivered(homeResult);
    pages[`home${key}`] = { text: home.text, commands: home.commands, nodes: homeResult.messages[0].nodes };
  }
  const normalize = (value: unknown) => String((value as { text: string }).text).replace(/\d+(?:\.\d+)?%/g, '<概率>');
  assert.match((pages.before as { text: string }).text, /保底\(84\/120\)/);
  assert.match((pages.after as { text: string }).text, /保底\(84\/120\)/);
  assert.equal(normalize(pages.before), normalize(pages.after));
  assert.equal((pages.homebefore as { text: string }).text, (pages.homeafter as { text: string }).text);
  if (process.env.TREASURE_V11_PREVIEW_OUTPUT) writeFileSync(process.env.TREASURE_V11_PREVIEW_OUTPUT, JSON.stringify(pages, null, 2));
});
