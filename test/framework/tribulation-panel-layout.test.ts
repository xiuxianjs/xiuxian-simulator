import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/tribulation/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const unit = { Name: '雷兵', HP: 100, MP: 50, PhysicalAttack: 20, MagicAttack: 30, PhysicalDefense: 5, MagicDefense: 6, Speed: 10 };
const progress = { successful: 1, requiredAttempts: 3, attackBonusPercent: 0.5, completed: false };
const preparation = {
  eventId: 7, targetRealm: '合体', status: 'opened', canStart: true, requiredAttempts: 3,
  opensAt: '2026-10-24T00:00:00Z', qualityProgress: progress,
  materials: [{ itemId: 10, itemName: '渡劫石', currentQuantity: 2, requiredQuantity: 1, sufficient: true }],
  gradeOptions: [
    { grade: 'low', attackMultiplier: 0.8, attackBonusPercent: 0.3 },
    { grade: 'standard', attackMultiplier: 1, attackBonusPercent: 0.5 },
    { grade: 'high', attackMultiplier: 1.2, attackBonusPercent: 1 }
  ]
};
const confirmation = {
  eventId: Number.MAX_SAFE_INTEGER, grade: 'high', attackMultiplier: 1.23456789012345,
  conditionVersion: 'a'.repeat(64), rewardScope: 'current', experienceBefore: 100, successExperienceCost: 0,
  failureExperienceAfter: 90, progress, materials: [{ itemId: 10, quantity: 1 }],
  battle: { mode: 'continuous_layers_v1', name: '四九雷劫', player: { ...unit, Name: '修士' }, layers: [1, 2, 3].map(layer => ({ layer, enemies: [unit] })) }
};
function cards(nodes: NonNullable<Parameters<typeof inspectMessage>[0]>) {
  return nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).filter(node => node.type === 'MD.blockquote').map(node => {
    assert.ok(Array.isArray(node.value));
    return inspectMessage([{ type: 'Markdown', value: node.value }]);
  });
}
for (const privateChat of [false, true]) {
  test(`渡劫准备按状态、材料、评级分块，选择按钮不再塞入长文案 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { tribulationPreparation: preparation }));
    const event = privateChat ? app.events.privateMessage({ text: '/我的渡劫', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的渡劫', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { kind: 'overview' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const rows = cards(message.nodes);
    assert.equal(rows.length, 5);
    assert.match(rows[0].text, /合体.*准备中/);
    assert.match(rows[0].text, /累计成功：1\/3/);
    assert.match(rows[1].text, /开劫材料.*渡劫石：2\/1/s);
    for (const [index, grade] of preparation.gradeOptions.entries()) {
      const row = rows[index + 2];
      assert.match(row.text, new RegExp(`雷劫双攻击 ×${grade.attackMultiplier}`));
      assert.ok(row.text.includes(`品质 +${grade.attackBonusPercent}点`));
      assert.deepEqual(row.commands, [`/渡劫评级 7 ${grade.grade}`]);
    }
    const view = inspectMessage(message.nodes);
    for (const command of ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(view.commands.includes(command));
    assert.doesNotMatch(view.text, /尚未安排|请发送/);
  });

  test(`确认与详情真实按钮往返保留原引用、完整倍率及80字符预算 private=${privateChat}`, async t => {
    const reference = 'r1_1_t_m1234_' + 'b'.repeat(24);
    const { app, requests } = await gameFixture(t, r => {
      const args = r.body.arguments as { kind: string };
      return businessEnvelope(r.bid, args.kind === 'reference' ? {
        eventId: confirmation.eventId, status: 'charging', grade: confirmation.grade, attackMultiplier: confirmation.attackMultiplier,
        conditionVersion: confirmation.conditionVersion, confirmedAt: preparation.opensAt, strikeAt: '2026-10-24T00:30:00Z', refunded: false,
        resolvedCommand: { kind: 'start', eventId: confirmation.eventId, input: { grade: confirmation.grade, attackMultiplier: confirmation.attackMultiplier, conditionVersion: confirmation.conditionVersion } }
      } : { confirmation, materialNames: { 10: '渡劫石' }, confirmationReference: reference });
    });
    const run = async (text: string) => {
      const event = privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
      const result = await app.runHandler(handler, event);
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      for (const command of inspectMessage(message.nodes).commands) {
        assert.ok([...command].length <= 80, `${[...command].length} chars / ${Buffer.byteLength(command)} bytes`);
      }
      return { view: inspectMessage(message.nodes), cards: cards(message.nodes) };
    };
    const base = `/渡劫评级 ${confirmation.eventId} high`;
    const first = await run(base);
    assert.equal(first.cards.length, 2);
    assert.doesNotMatch(first.view.text, /当前配装|雷兵|第1层/);
    const costs = first.cards.find(card => card.commands.includes('/渡劫开劫 ' + reference));
    assert.ok(costs);
    for (const fact of ['渡劫石 ×1', '失败后剩余：90', '落雷时修为保留90%', '新增修为也计入', '复活次数不重置', '确认开始即扣材料', '30分钟后落雷', '系统取消返还', '6小时']) assert.ok(costs.text.includes(fact), fact);
    assert.ok(costs.commands.includes('/我的渡劫'));
    assert.match(first.view.text, /1.23456789012345/);
    const detailCommand = first.view.commands.find(command => command === base + ' 详情');
    assert.ok(detailCommand);
    const detail = await run(detailCommand);
    assert.match(detail.view.text, /当前配装/);
    assert.equal(detail.cards.filter(card => /^第\d+层/.test(card.text)).length, 3);
    for (const layer of detail.cards.filter(card => /^第\d+层/.test(card.text))) {
      for (const value of ['生命 100', '物攻 20', '法攻 30', '物防 5', '法防 6', '速度 10']) assert.ok(layer.text.includes(value));
    }
    assert.ok(detail.view.commands.includes('/渡劫开劫 ' + reference));
    const collapse = detail.view.commands.find(command => command === base);
    assert.ok(collapse);
    await run(collapse);
    assert.deepEqual(requests.map(r => r.body.arguments), Array.from({ length: 3 }, () => ({ kind: 'confirm', eventId: confirmation.eventId, grade: 'high' })));
    await run('/渡劫开劫 ' + reference);
    assert.deepEqual(requests[3].body.arguments, { kind: 'reference', reference });
    assert.equal(requests.length, 4, '详情查询没有额外写入或自动开劫');
  });
}

for (const status of ['charging', 'failed', 'succeeded', 'evaded']) {
  test(`状态${status}只显示实际时间，关闭评级动作`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { tribulationPreparation: { ...preparation, status, canStart: false, gradeOptions: [] } }));
    const result = await app.runHandler(handler, app.events.privateMessage({ text: '/我的渡劫', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(!view.commands.some(command => command.startsWith('/渡劫评级 ')));
    assert.doesNotMatch(view.text, /尚未安排|确认截止|再次开启最早/);
  });
}

test('失败结算按结果、实际消耗、劫况分块且保留状态入口', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
    eventId: 7, grade: 'high', success: false, promoted: false, experienceBefore: 100, experienceAfter: 90, progress,
    materials: [{ itemId: 10, itemName: '渡劫石', requiredQuantity: 1 }],
    battle: { name: '四九雷劫', summary: '本次未通过', totalLayers: 3, passedLayers: 2 },
    conditions: { disruption: { count: 1, attackBonusPercent: 1 } }
  }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫结算 7', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const rows = cards(message.nodes);
  assert.equal(rows.length, 3);
  assert.match(rows[0].text, /本次通过：2\/3层/);
  assert.match(rows[1].text, /修为：100 → 90/);
  assert.match(rows[1].text, /已消耗：渡劫石 ×1/);
  assert.match(rows[2].text, /本场捣乱：1人/);
  assert.ok(inspectMessage(message.nodes).commands.includes('/我的渡劫'));
});
