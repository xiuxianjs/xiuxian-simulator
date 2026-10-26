import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import dailyPanel from '../../src/response/activityPoints/daily/res';
import weeklyPanel from '../../src/response/activityPoints/weekly/res';
import claimAll from '../../src/response/activityPoints/claimAll/res';
import { parseRobotActivityClaimAll } from '../../src/api/bot/activity-points-robot';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const kind of ['日常', '周常']) {
  for (const tier of [false, true]) {
    test(`${kind} 单项奖励补领 ${tier ? '含档位' : '仅任务'}`, async t => {
      const data = {
        userName: '审计道友', partial: false,
        taskRewards: [{ type: 'currency', name: '灵晶', amount: 20 }, { type: 'item', name: '元力丹', amount: 1 }],
        claimed: tier ? [{ userName: '审计道友', requiredPoints: 100, issued: [{ type: 'currency', name: '灵晶', amount: 300 }] }] : []
      };
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
      const result = await app.runHandler(claimAll, app.events.groupMessage({ text: `/一键领取${kind}活跃奖励`, platform: 'qq-bot' }));
      assert.equal(requests.length, 1);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.match(view.text, /任务奖励：灵晶×20、元力丹×1/);
      assert.equal(view.text.includes('100点：灵晶×300'), tier);
      assert.ok(view.commands.includes(`/${kind}活跃`));
      assert.ok(!view.text.includes('领取失败'));
    });
  }
}

test('only-task receipts require positive rewards and identity; old tier receipts remain accepted', () => {
  assert.throws(() => parseRobotActivityClaimAll({ claimed: [], partial: false }), /响应不完整/);
  assert.throws(() => parseRobotActivityClaimAll({ claimed: [], partial: false, userName: '道友', taskRewards: [{ type: 'item', name: '丹药', amount: 0 }] }), /响应不完整/);
  assert.throws(() => parseRobotActivityClaimAll({ claimed: [], partial: false, taskRewards: [{ type: 'item', name: '丹药', amount: 1 }] }), /响应不完整/);
  assert.equal(parseRobotActivityClaimAll({ partial: false, claimed: [{ userName: '道友', requiredPoints: 20, issued: [{ type: 'currency', name: '灵晶', amount: 300 }] }] }).userName, '道友');
});

for (const [kind, label, handler] of [['daily', '日常', dailyPanel], ['weekly', '周常', weeklyPanel]] as const) {
  test(`${label} 全档位已领取后仍展示任务补领入口`, async t => {
    const data = { rewardType: kind, cyclePeriod: 'audit', currentPoints: 100, taskRewardsCanClaim: true, tasks: [], rewards: [] };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(handler, app.events.groupMessage({ text: `/${label}活跃`, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(inspectMessage(message.nodes).commands.includes(`/一键领取${label}活跃奖励`));
  });
}
