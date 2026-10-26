import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import single from '../../src/response/equipment/decompose/res';
import batch from '../../src/response/equipment/batchDecompose/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { handler: single, command: '/分解装备 101', operation: 'equipment.decompose', args: { instanceId: '101' }, reason: '请先卸下装备再分解', expected: '/我的装备', text: '不自动卸下' },
  { handler: single, command: '/分解装备 101', operation: 'equipment.decompose', args: { instanceId: '101' }, reason: '该装备已锁定，无法分解。请先解锁', expected: '/储物袋 装备', text: '不自动解锁' },
  { handler: single, command: '/分解装备', operation: 'equipment.decompose', args: { instanceId: null }, reason: '参数错误\n已装备或已锁定的装备无法分解', expected: '/储物袋 装备', text: '不使用模板ID或页内序号' },
  { handler: single, command: '/分解装备 x', operation: 'equipment.decompose', args: { instanceId: 'x' }, reason: '装备ID必须是大于0的数字', expected: '/储物袋 装备', text: '不生成示例ID分解按钮' },
  { handler: single, command: '/分解装备 101', operation: 'equipment.decompose', args: { instanceId: '101' }, reason: '分解请求未获确认\n\n重复提醒', expected: '/储物袋 装备', text: '不证明没有消耗或收益' },
  { handler: batch, command: '/一键分解装备', operation: 'equipment.batch-decompose-query', args: { gradeName: '' }, reason: '暂无可分解的装备', expected: '/储物袋 装备', text: '不默认解锁或卸下装备' },
  { handler: batch, command: '/一键分解装备 不存在', operation: 'equipment.batch-decompose-query', args: { gradeName: '不存在' }, reason: '无效的品级：不存在', expected: '/一键分解装备', text: '新预览仍需你确认' },
  { handler: batch, command: '/一键分解装备 全部', operation: 'equipment.batch-decompose-query', args: { gradeName: '全部' }, reason: '预览失败', expected: '/一键分解装备', text: '不沿用过期确认' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.includes('确认分解'));
    assert.ok(!view.commands.some(command => /^\/(分解装备|解锁|卸下)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const options = { success: true, message: '原预览', totalCount: 2, processCount: 2, remainingCount: 0, totalYield: 6, gradeBreakdown: [{ id: 1, gradeName: '一品', level: 1, count: 2 }] };
const preview = { mode: 'preview', options, preview: options, selectedGrade: { id: 1, name: '一品' } };
for (const isPrivate of [false, true]) for (const outcome of ['unknown', 'changed', 'cancel']) {
  test(`real subscription ${outcome} preserves state-first recovery private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => requests.length === 1 ? businessEnvelope(request.bid, preview)
      : outcome === 'unknown' ? businessEnvelope(request.bid, {})
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '装备状态已变化，请重新确认分解', buttons: [], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/一键分解装备 一品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解装备 一品', platform: 'qq-bot' });
    const first = await app.runHandler(batch, event);
    assert.equal(first.messages.length, 1);
    assert.ok(inspectMessage(first.messages[0].nodes).text.includes('确认时重新筛选当前范围'));
    const previewView = inspectMessage(first.messages[0].nodes);
    assert.ok(previewView.text.includes('请在60秒内回复【确认分解】或【取消】'));
    assert.ok(previewView.commands.includes('确认分解'));
    assert.ok(previewView.commands.includes('取消'));
    const follow = isPrivate ? app.events.privateMessage({ text: outcome === 'cancel' ? '取消' : '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: outcome === 'cancel' ? '取消' : '确认分解', platform: 'qq-bot' });
    const result = await app.dispatch(follow);
    assert.equal(requests.length, outcome === 'cancel' ? 1 : 2);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(outcome === 'unknown' ? '分解结果未获完整确认' : outcome === 'changed' ? '状态已变化' : '已取消分解操作'), view.text);
    assert.ok(view.commands.includes(outcome === 'unknown' ? '/储物袋 装备' : '/一键分解装备'));
    assert.ok(!view.commands.includes('确认分解'));
    if (outcome !== 'cancel') {
      assert.deepEqual(requests[1].body.arguments, { gradeId: '1' });
      assert.ok(requests[1].idempotencyKey);
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const handler of [single, batch]) for (const isPrivate of [false, true]) {
  test(`structured decompose feedback retained private=${isPrivate} batch=${handler === batch}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: '原原因', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '原查询', command: '/储物袋 装备' }]
    }]));
    const command = handler === single ? '/分解装备 101' : '/一键分解装备';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原原因', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/储物袋 装备']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`expired real confirmation gives preview action and makes no write private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, preview));
    const event = isPrivate ? app.events.privateMessage({ text: '/一键分解装备 一品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解装备 一品', platform: 'qq-bot' });
    await app.runHandler(batch, event);
    const result = await app.invoke(event, () => mock.timers.tick(60_000));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes('确认超时'));
    assert.ok(view.commands.includes('/一键分解装备'));
    assert.ok(!view.commands.includes('确认分解'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    await app.dispatch(isPrivate ? app.events.privateMessage({ text: '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: '确认分解', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
  });
}
