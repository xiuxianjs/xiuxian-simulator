import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import buy from '../../src/response/market/confirmBuy/res';
import sell from '../../src/response/market/sell/res';
import cancel from '../../src/response/market/cancel/res';
import credibility from '../../src/response/market/credibility/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: buy, command: '/选购 2 3 确认', reason: '今日购买额度不足', expected: '/珍宝楼', text: '补灵晶不能增加今日额度' },
  { handler: buy, command: '/选购 2 3 确认', reason: '灵晶不足，需要300，当前100', expected: '/我的信息', text: '不能用灵石余额代替灵晶' },
  { handler: buy, command: '/选购 2', reason: '商品仍在公示期', expected: '/珍宝楼', text: '不能绕过公示期' },
  { handler: buy, command: '/选购 2', reason: '挂单不可用', expected: '/珍宝楼', text: '重新核对现有数量与价格' },
  { handler: buy, command: '/选购 2 3', reason: '库存不足', expected: '/珍宝楼', text: '不沿用旧确认盲目重试' },
  { handler: buy, command: '/选购 2', reason: '不能购买自己的挂单', expected: '/我的上架', text: '自己的挂单不能买回' },
  { handler: buy, command: '/选购 2', reason: '该物品没有可购买的挂单', expected: '/珍宝楼', text: '挂单状态可能已变化' },
  { handler: buy, command: '/选购 2', reason: '挂单资产不存在或状态已变化', expected: '/珍宝楼', text: '不让买家补充自己的背包代替卖家资产' },
  { handler: buy, command: '/选购', reason: '参数错误：/选购 上架ID [数量]', expected: '/珍宝楼', text: '不直接使用示例编号交易' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '灵晶不足，无法支付上架手续费', expected: '/我的信息', text: '不把售出后收益当作已可支付' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '上架中的物品最多5个，请先下架部分物品', expected: '/我的上架', text: '不自动撤单腾位' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '物品被锁定或数量不足', expected: '/储物袋', text: '解锁不保证可交易' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '物品不可交易', expected: '/交易上架', text: '交易许可' },
  { handler: sell, command: '/交易上架 装备 2 100', reason: '装备不可交易', expected: '/储物袋', text: '装备/学习/锁定状态' },
  { handler: sell, command: '/交易上架 功法 2 100', reason: '功法不可交易', expected: '/储物袋', text: '解锁不保证可交易' },
  { handler: sell, command: '/交易上架 天工 2 100', reason: '天工工具不可交易', expected: '/交易上架', text: '有效背包记录' },
  { handler: sell, command: '/交易上架 本命 2 100', reason: '本命物不可交易', expected: '/储物袋', text: '是否卸下或解锁由你决定' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '物品分类不匹配', expected: '/交易上架', text: '模板编号与本人实例编号不能混用' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '信誉分未达标，不可上架稀有道具', expected: '/信誉分', text: '不承诺充值或反复成交' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '单价须在 90~180 灵晶之间', expected: '/交易上架', text: '不自动替你修改价格' },
  { handler: sell, command: '/交易上架 装备 2 100', reason: '独立资产仅支持单件', expected: '/交易上架', text: '独立资产按单件处理' },
  { handler: sell, command: '/交易上架 道具 丹药 2 1 100', reason: '当前平台消息缺少唯一标识，无法安全提交写操作', expected: '/我的交易记录', text: '不重复确认' },
  { handler: cancel, command: '/交易下架 2', reason: '上架锁定中，请在60秒后再试', expected: '/我的上架', text: '按原提示的剩余秒数' },
  { handler: cancel, command: '/交易下架 2', reason: '只能下架自己的物品', expected: '/我的上架', text: '下架仅能操作自己的物品' },
  { handler: cancel, command: '/交易下架 2', reason: '该上架已下架或已售罄', expected: '/我的交易记录', text: '不把缺少旧挂单当作物品丢失' },
  { handler: cancel, command: '/交易下架 2', reason: '上架不存在或已删除', expected: '/我的上架', text: '保留原回执' },
  { handler: cancel, command: '/交易下架 2', reason: '挂单资产不存在或状态已变化', expected: '/我的交易记录', text: '结合本人挂单与原下架回执' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '珍宝楼', heading: '', text: entry.reason, buttons: [], advice: [] }]),
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
    assert.ok(!view.commands.some(command => /^\/(?:选购|交易下架)(?:\s|$)|^\/交易上架\s.*\s\d+/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const text of [
  '购买成功：获得2个，消耗200灵晶（目标3个，实际购得2个，缺货1个）',
  '购买成功：获得0个，消耗0灵晶；系统收回2个低价挂单物品'
]) for (const isPrivate of [false, true]) {
  test(`成功回执的部分购买或系统回收不触发补买 private=${isPrivate} ${text}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { message: text }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/选购 2 3 确认', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/选购 2 3 确认', platform: 'qq-bot' });
    const result = await app.runHandler(buy, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(view.text.includes('不自动补买剩余数量'));
    assert.ok(view.commands.includes('/我的交易记录'));
    assert.ok(view.commands.includes('/珍宝楼'));
    assert.ok(!view.commands.some(command => command.startsWith('/选购 ')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const text of ['市场服务未启用', '市场上架规则加载失败，请稍后再试', '选购响应不完整']) {
  test(`市场服务异常保留原因不猜余额：${text}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '珍宝楼', heading: '', text, buttons: [], advice: []
    }]));
    const result = await app.runHandler(buy, app.events.privateMessage({ text: '/选购 2', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(!view.text.includes('建议：'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const limit of [3, 5]) for (const isPrivate of [false, true]) {
  test(`信誉气泡使用服务端免扣分撤单额度 ${limit} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      baseScore: 100, vipBonus: 0, monthCardBonus: 0, activityScore: 0,
      totalScore: 100, threshold: 60, dailyFreeCancelLimit: limit, maxScore: 200,
      isAboveThreshold: true, progressBar: '[■■■■■□□□□□] 50%', statusText: '信誉良好'
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/信誉分', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/信誉分', platform: 'qq-bot' });
    const result = await app.runHandler(credibility, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`每日免信誉扣分撤单：${limit} 次`));
    assert.ok(!view.text.includes('每日免费撤单'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`无估值上架不提供虚构参考价按钮 private=${isPrivate}`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
      mode: 'start',
      range: { minPrice: 1, maxPrice: 99999999, referencePrice: 0, source: 'fallback', templateItemId: 1, maxListingQuantity: 99, fixedQuantity: true, credibilityReady: true }
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/交易上架 本命 2', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/交易上架 本命 2', platform: 'qq-bot' });
    const result = await app.runHandler(sell, event);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('暂无可靠参考价'), view.text);
    assert.ok(!view.commands.some(command => /\s(?:0|50000000)$/.test(command)));
  });
}
