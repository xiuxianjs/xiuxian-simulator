import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import exchange from '../../src/response/guild/exchange/res';
import shop from '../../src/response/guild/shop/res';
import checkin from '../../src/response/guild/checkin/res';
import worship from '../../src/response/guild/worship/res';
import mining from '../../src/response/guild/mining/res';
import stipend from '../../src/response/guild/stipend/res';
import single from '../../src/response/guild/claimMilestone/res';
import all from '../../src/response/guild/claimAllMilestones/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: exchange, command: '/宗门商店兑换 1', reason: '贡献点不足', expected: '/宗门日常', text: '不为补贡献盲目反复兑换' },
  { handler: exchange, command: '/宗门商店兑换 1', reason: '该商品已经兑换', expected: '/宗门商店', text: '已兑换标记' },
  { handler: exchange, command: '/宗门商店兑换 1', reason: '宗门商品不存在', expected: '/宗门商店', text: '旧编号' },
  { handler: exchange, command: '/宗门商店兑换 99', reason: '商品编号无效，请输入1-6之间的数字', expected: '/宗门商店', text: '本次列表编号' },
  { handler: exchange, command: '/宗门商店兑换 1', reason: '宗门商店未开放，请提升宗门等级以解锁', expected: '/我的宗门', text: '本人境界不能替代宗门等级' },
  { handler: exchange, command: '/宗门商店兑换 6', reason: '锻造耗材位需宗门商店二级解锁；已升级请先刷新商店', expected: '/我的宗门', text: '不自动升级或刷新扣费' },
  { handler: shop, command: '/宗门商店', reason: '商店暂无商品，请宗主或副宗主刷新商店', expected: '/我的宗门', text: '由宗主或副宗主决定' },
  { handler: shop, command: '/宗门商店', reason: '商店数据异常，请宗主或副宗主刷新商店', expected: '/我的宗门', text: '不自动扣贡献刷新' },
  { handler: shop, command: '/宗门商店 刷新', reason: '今日商店刷新次数已用尽', expected: '/我的宗门', text: '等待恢复' },
  { handler: shop, command: '/宗门商店 刷新', reason: '贡献点不足', expected: '/宗门周常', text: '核对成本与收益' },
  { handler: checkin, command: '/宗门签到', reason: '你今天已经签到过了', expected: '/宗门日常', text: '本项今日已完成' },
  { handler: worship, command: '/祭祀祖师 灵石', reason: '今日已完成祭祀祖师', expected: '/宗门日常', text: '不额外消耗祭祀货币' },
  { handler: worship, command: '/祭祀祖师 灵晶', reason: '灵晶不足，祭祀需要消耗灵晶×200', expected: '/祭祀祖师', text: '不自动改用另一种货币' },
  { handler: mining, command: '/宗门采矿', reason: '宗门灵脉未开放', expected: '/我的宗门', text: '不能只补充个人材料' },
  { handler: mining, command: '/宗门采矿', reason: '当前灵脉等级无法采矿', expected: '/我的宗门', text: '宗门等级与灵脉状态' },
  { handler: stipend, command: '/领取宗门俸禄', reason: '当前职位没有宗门俸禄', expected: '/我的宗门', text: '不自动任命或承诺升职' },
  { handler: stipend, command: '/领取宗门俸禄', reason: '本周活跃度未达40，暂无法领取俸禄', expected: '/宗门周常', text: '本周活跃与领取状态' },
  { handler: stipend, command: '/领取宗门俸禄', reason: '本周俸禄已领取', expected: '/宗门周常', text: '已领取则等待下一周期' },
  { handler: stipend, command: '/领取宗门俸禄', reason: '宗门灵石不足', expected: '/我的宗门', text: '不等同本人灵石余额' },
  { handler: single, command: '/领取宗门日活奖励 1', reason: '活跃度不足，当前：5，需要：10', expected: '/宗门日常', text: '已领取状态' },
  { handler: single, command: '/领取宗门周活奖励 1', reason: '奖励已领取', expected: '/宗门周常', text: '另一周期的活跃' },
  { handler: single, command: '/领取宗门日活奖励 1', reason: '里程碑不存在或未启用', expected: '/宗门日常', text: '奖励编号' },
  { handler: all, command: '/一键领取宗门日活奖励', reason: '当前没有可领取的日活奖励。', expected: '/宗门日常', text: '未达标先完成仍有效的任务' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '宗门提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:宗门商店兑换|领取宗门日活奖励|领取宗门周活奖励|领取宗门俸禄|一键领取|宗门商店 刷新)(?:\s|$)/.test(command)));
    assert.ok(!view.commands.some(command => command.startsWith('/祭祀祖师 ')));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const weekly of [false, true]) for (const isPrivate of [false, true]) {
  test(`一键奖励部分完成保留已领清单 weekly=${weekly} private=${isPrivate}`, async t => {
    const text = `已领取部分${weekly ? '周活' : '日活'}奖励：\n• 10点 已领贡献奖励\n剩余领取失败：领取服务暂不可用`;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      partial: true, claimed: [{ id: 1, threshold: 10, description: '已领贡献奖励' }], message: text
    }));
    const command = `/一键领取宗门${weekly ? '周' : '日'}活奖励`;
    const event = isPrivate
      ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(all, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(view.text.includes('后续失败不代表整批回滚'));
    assert.ok(view.commands.includes(weekly ? '/宗门周常' : '/宗门日常'));
    assert.ok(!view.commands.some(command => command.includes('领取')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const [handler, command, data, expected] of [
  [exchange, '/宗门商店兑换', { outcome: 'usage' }, '/宗门商店'],
  [single, '/领取宗门日活奖励', { outcome: 'usage' }, '/宗门日常'],
  [single, '/领取宗门周活奖励', { outcome: 'usage' }, '/宗门周常']
] as const) {
  test(`缺少编号先查看有效列表 ${command}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.ok(inspectMessage(message.nodes).commands.includes(expected));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('采矿进行中保留剩余时间，不重新计算或开始', async t => {
  const text = '采矿进行中...\n每小时产出：10灵石\n剩余时间：0小时30分钟';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    message: text, receipt: { outcome: 'in_progress', message: text, guildId: 1, guildName: '测试宗',
      veinLevel: 1, miningQuota: 10, started: false, settledHours: 0, spiritStoneAdded: 0,
      contributionAdded: 0, dailyActivityAdded: 0, capReached: false, remainingSeconds: 1800 }
  }));
  const result = await app.runHandler(mining, app.events.privateMessage({ text: '/宗门采矿', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes(text));
  assert.ok(view.text.includes('重复请求不会加快产出'));
  assert.ok(view.commands.includes('/宗门日常'));
  assert.ok(!view.commands.includes('/宗门采矿'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const reason of ['宗门商店配置不存在', '宗门服务未初始化', '奖励响应不完整']) {
  test(`经济内部异常不解释成资源不足：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '宗门提示', heading: '', text: reason, buttons: [], advice: []
    }]));
    const result = await app.runHandler(exchange, app.events.privateMessage({ text: '/宗门商店兑换 1', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(!view.text.includes('建议：'));
    assert.ok(!view.text.includes('贡献点不足'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
