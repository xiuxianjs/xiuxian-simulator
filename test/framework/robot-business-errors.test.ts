import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import claimAchievements from '../../src/response/achievements/claimAll/res';
import claimBounty from '../../src/response/bounty/claim/res';
import decompose from '../../src/response/equipment/decompose/res';
import cultivate from '../../src/response/cavePlot/cultivate/res';
import reset from '../../src/response/skillBook/reset/res';
import returnFromExploration from '../../src/response/seclusion/end/res';
import meridians from '../../src/response/meditation/meridian/res';
import home from '../../src/response/message/me/res';
import { businessEnvelope, gameFixture } from './fixture';

// Analytics uses native timers outside the framework clock.
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

const entries = [
  { handler: claimAchievements, command: '/一键领取成就', operation: 'achievements.claim-all', status: 409, reason: '当前没有可领取的成就奖励。', fallback: '成就领取结果未获完整确认' },
  { handler: claimBounty, command: '/领赏 1', operation: 'bounty.claim', status: 404, reason: '悬赏不存在', fallback: '领赏结果未获完整确认' },
  { handler: decompose, command: '/分解装备 1', operation: 'equipment.decompose', status: 403, reason: '装备已锁定，无法分解', fallback: '分解装备失败' },
  { handler: cultivate, command: '/开垦 1', operation: 'cave.cultivate', status: 400, reason: '灵石不足，无法开垦', fallback: '开垦灵田结果未获完整确认' },
  { handler: reset, command: '/确认重制功法', operation: 'skill-books.reset', status: 422, reason: '没有待确认的功法重制', fallback: '功法重制结果未获完整确认' },
  { handler: returnFromExploration, command: '/返程', operation: 'seclusion.end', status: 409, reason: '你现在没有可以结算的探索。', fallback: '服务暂时不可用' },
  { handler: meridians, command: '/经络', operation: 'meridians.view', status: 403, reason: '当前境界尚未开放经络', fallback: '查看经络失败' }
];

for (const entry of entries) {
  for (const privateChat of [false, true]) {
    test(`${entry.operation} HTTP ${entry.status} 保留业务原因（${privateChat ? '私聊' : '群聊'}）`, async t => {
      const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: entry.reason }), entry.status);
      const event = privateChat
        ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
        : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
      const result = await app.runHandler(entry.handler, event);
      assert.equal(requests.length, 1, '不重试或重复结算');
      assert.equal(requests[0].path, `/api/v2/robot/business/${entry.operation}`);
      assert.ok(requests[0].idempotencyKey);
      assert.equal(result.nextCalls.length, 0);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.ok(message.text.includes(entry.reason), message.text);
      assert.ok(!message.text.includes(entry.fallback), message.text);
      assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }

  test(`${entry.operation} 内部异常仍走原有失败提示`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'SQL private table missing' }), 500);
    const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(result.messages[0].text.includes(entry.fallback), result.messages[0].text);
    assert.ok(!result.messages[0].text.includes('SQL private table missing'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('主页专用请求保留业务拒绝原因', async t => {
  const reason = '玩家资料不存在';
  const { app, requests } = await gameFixture(t, () => ({ code: 'NOT_FOUND', message: reason }), 404);
  const result = await app.runHandler(home, app.events.privateMessage({ text: '/我', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.ok(result.messages[0].text.includes(reason), result.messages[0].text);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('已返回业务反馈气泡的接口继续展示原气泡一次', async t => {
  const reason = '这件装备已经分解';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [
    { title: '分解装备', heading: '', text: reason, buttons: [], advice: [] }
  ]));
  const result = await app.runHandler(decompose, app.events.privateMessage({ text: '/分解装备 1', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.ok(result.messages[0].text.includes(reason));
  assert.ok(!result.messages[0].text.includes('操作未完成'));
  assert.equal(result.nextCalls.length, 0);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
