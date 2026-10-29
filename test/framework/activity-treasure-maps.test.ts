import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import dailyHandler from '../../src/response/activityPoints/daily/res';
import weeklyHandler from '../../src/response/activityPoints/weekly/res';
import { businessEnvelope, gameFixture } from './fixture';

const previews: Record<string, unknown> = {};
after(async () => {
  if (process.env.ACTIVITY_TREASURE_PREVIEW_OUTPUT) {
    writeFileSync(process.env.ACTIVITY_TREASURE_PREVIEW_OUTPUT, JSON.stringify({
      note: 'Offline example thresholds, original rewards, task names/progress and statuses; not live database configuration.',
      previews
    }, null, 2), 'utf8');
  }
  await shutdownLogger();
});

const thresholds = [10, 20, 40, 60, 80];

function dailyFixture(claimed = false) {
  return {
    rewardType: 'daily', cyclePeriod: '2026-10-29', currentPoints: 80, taskRewardsCanClaim: false,
    tasks: [{ taskId: 1, name: '日常任务示例', description: '离线任务字段保留测试', actionKey: 'fixture_daily', activityPoints: 10,
      targetValue: 1, currentValue: 1, completed: true, rewardName: '', rewardQuantity: 0 }],
    // Deliberately out of order: grouping is by distinct points, never task or reward row index.
    rewards: [80, 10, 60, 20, 40].flatMap(requiredPoints => [
      { requiredPoints, name: '灵石', category: 'item', currencyCode: '', itemId: 1, quantity: 10, claimed, canClaim: !claimed },
      { requiredPoints, name: '灵肥', category: 'item', currencyCode: '', itemId: 2, quantity: 1, claimed, canClaim: !claimed },
      ...([60, 80].includes(requiredPoints)
        ? [{ requiredPoints, name: '藏宝图', category: 'item', currencyCode: '', itemId: 99, quantity: 1, claimed, canClaim: !claimed }]
        : [])
    ])
  };
}

function facts(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const nodes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  for (const node of nodes) if (node.type === 'MD.button') assert.equal(node.options?.autoEnter, false);
  assert.doesNotMatch(JSON.stringify(result.messages[0].nodes), /"show"\s*:/);
  const view = inspectMessage(result.messages[0].nodes);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  return { view, nodes: result.messages[0].nodes };
}

for (const privateChat of [false, true]) test(`日活五档原奖励合并，第4/5档普通物品图各1张 private=${privateChat}`, async t => {
  const data = dailyFixture();
  assert.ok(data.rewards.every(reward => !('treasureMapQuantity' in reward) && !('treasureMapClaimable' in reward)));
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const event = privateChat
    ? app.events.privateMessage({ text: '/日常活跃', platform: 'qq-bot' })
    : app.events.groupMessage({ text: '/日常活跃', platform: 'qq-bot' });
  const { view, nodes } = facts(await app.runHandler(dailyHandler, event));
  assert.match(view.text, /当前活跃度：80/);
  assert.match(view.text, /◆ 日常任务示例（1\/1）\+10活跃/);
  const rows = view.text.split('\n').filter(line => /点 →/.test(line));
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(line => Number(/(\d+)点 →/.exec(line)?.[1])), thresholds);
  rows.forEach((line, index) => {
    assert.match(line, /灵石 x10、灵肥 x1/);
    assert.equal(line.includes('藏宝图 x1'), index >= 3);
    assert.equal(view.commands.filter(command => command === `/领取日常活跃奖励 ${thresholds[index]}`).length, 1);
  });
  assert.equal(view.text.match(/藏宝图 x1/g)?.length, 2);
  for (const command of ['/日常活跃', '/周常活跃', '/一键领取日常活跃奖励', '/日常签到', '/更多']) assert.ok(view.commands.includes(command));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/activity-points.daily');
  if (privateChat) previews.daily = { text: view.text, commands: view.commands, nodes, fixture: data };
});

test('原日活档位已领取时，新增普通图行不提供当日补领入口', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, dailyFixture(true)));
  const { view } = facts(await app.runHandler(dailyHandler, app.events.privateMessage({ text: '/日常活跃', platform: 'qq-bot' })));
  assert.equal(view.text.match(/✅\d+点 →/g)?.length, 5);
  assert.equal(view.text.match(/藏宝图 x1/g)?.length, 2);
  assert.doesNotMatch(view.text, /补领/);
  assert.ok(!view.commands.some(command => command.startsWith('/领取日常活跃奖励 ')));
  assert.ok(!view.commands.includes('/一键领取日常活跃奖励'));
  assert.equal(requests.length, 1);
});

test('同档仅一原奖励行可领时仍保留合并领取入口', async t => {
  const data = dailyFixture();
  data.rewards.forEach(reward => { reward.canClaim = reward.name === '灵石'; });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const { view } = facts(await app.runHandler(dailyHandler, app.events.privateMessage({ text: '/日常活跃', platform: 'qq-bot' })));
  assert.equal(view.text.match(/🔓\d+点 →/g)?.length, 5);
  for (const points of thresholds) assert.equal(view.commands.filter(command => command === `/领取日常活跃奖励 ${points}`).length, 1);
});

test('周常第5任务读取服务端打劫目标25与当前进度，不改其他布局', async t => {
  const taskBase = { description: '离线任务展示字段', rewardName: '', rewardQuantity: 0, activityPoints: 10 };
  const data = {
    rewardType: 'weekly', cyclePeriod: '2026-10-26', currentPoints: 40, taskRewardsCanClaim: false,
    tasks: [
      ...[1, 2, 3, 4].map(taskId => ({ ...taskBase, taskId, name: `周常任务示例${taskId}`, actionKey: `fixture_weekly_${taskId}`,
        targetValue: 10, currentValue: 10, completed: true })),
      { ...taskBase, taskId: 5, name: '每周打劫', actionKey: 'fixture_robbery', targetValue: 25, currentValue: 7, completed: false }
    ],
    rewards: thresholds.flatMap((requiredPoints, index) => ['灵石', '灵肥'].map((name, rewardIndex) => ({
      requiredPoints, name, category: 'item', currencyCode: '', itemId: rewardIndex + 1, quantity: rewardIndex ? 1 : 10,
      claimed: index < 2, canClaim: index === 2, treasureMapQuantity: [2, 3, 5, 5, 5][index],
      treasureMapGranted: index === 1, treasureMapClaimable: index === 0 || index === 2, treasureMapBackfillOnly: index === 0
    })))
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const { view, nodes } = facts(await app.runHandler(weeklyHandler, app.events.privateMessage({ text: '/周常活跃', platform: 'qq-bot' })));
  assert.match(view.text, /◇ 每周打劫（7\/25）\+10活跃/);
  assert.equal(view.text.split('\n').filter(line => /活跃$/.test(line) && /[◆◇]/.test(line)).length, 5);
  assert.ok(view.text.indexOf('周常任务示例4') < view.text.indexOf('每周打劫'));
  for (const [index, points] of thresholds.entries()) assert.ok(view.text.includes(`${points}点 → 灵石 x10、灵肥 x1、藏宝图 x${[2, 3, 5, 5, 5][index]}`));
  assert.ok(view.commands.includes('/一键领取周常活跃奖励'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/activity-points.weekly');
  previews.weekly = { text: view.text, commands: view.commands, nodes, fixture: data };
});
