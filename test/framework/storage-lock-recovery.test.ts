import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import lock from '../../src/response/storage/lock/res';
import unlock from '../../src/response/storage/unlock/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { args: [], suffix: '', reason: '参数错误\n可用分类: 材料、道具、装备', expected: '/储物袋', text: '模板ID和页内序号不能替代实例ID' },
  { args: ['装备', '101'], suffix: '装备 101', reason: '分类: 装备\n物品ID 101 不存在', expected: '/储物袋 装备', text: '不自动反向操作' },
  { args: ['材料', '101'], suffix: '材料 101', reason: '分类: 材料\n物品不存在或不属于你', expected: '/储物袋 材料', text: '名称操作也可能已有部分变更' },
  { args: ['材料', '草药'], suffix: '材料 草药', reason: '分类“材料-草药”中没有可修改的物品\n可能原因:\n1. 没有物品\n2. 已达到目标状态', expected: '/储物袋 材料', text: '不等于已确认全部达到目标' },
  { args: ['装备', '101'], suffix: '装备 101', reason: '分类: 装备\n已装备的装备无需锁定', expected: '/我的装备', text: '不自动卸下后操作' },
  { args: ['天工', '101'], suffix: '天工 101', reason: '分类: 天工\n已启用的天工无需锁定', expected: '/储物袋 天工', text: '不自动替换或卸下工具' },
  { args: ['功法', '101'], suffix: '功法 101', reason: '分类: 功法\n已学习的功法无需锁定', expected: '/储物袋 功法', text: '不自动卸下、分解或重复学习' },
  { args: ['本命', '101'], suffix: '本命 101', reason: '分类: 本命\n该本命物正在珍宝楼上架中，无法锁定', expected: '/我的上架', text: '是否下架由你决定' },
  { args: ['同名'], suffix: '同名', reason: '按名称操作失败\n\n重复提醒', expected: '/储物袋', text: '前段完成不会因后段异常而回滚' }
];
for (const handler of [lock, unlock]) for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  const word = handler === lock ? '锁定' : '解锁';
  test(`${word} ${entry.suffix} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, blocks: [{ text: entry.reason, quoted: false }], buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const command = `/${word}${entry.suffix ? ' ' + entry.suffix : ''}`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { args: entry.args });
    assert.ok(requests[0].path.endsWith(handler === lock ? '/storage.lock' : '/storage.unlock'));
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(锁定|解锁|卸下|替换)\s/.test(command)));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const handler of [lock, unlock]) for (const isPrivate of [false, true]) {
  const word = handler === lock ? '锁定' : '解锁';
  test(`${word} incomplete receipt keeps unknown state private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const command = `/${word} 装备 101`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(`${word}物品失败`));
    assert.ok(view.text.includes('未知结果不证明没有变更'));
    assert.ok(view.commands.includes('/储物袋'));
    assert.ok(!view.text.includes(`✅ ${word}成功`));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`${word} name issues retain committed count and warning private=${isPrivate}`, async t => {
    const data = { mode: 'name', category: '', compound: false, itemId: 0, itemName: '同名', result: {
      kind: 'name', name: { completion: 'completed', changedCount: 1, changes: [{ asset: 'item', templateId: 9, count: 1, name: '同名' }],
        issues: [{ stage: 'itemTemplate', templateId: 10, disposition: 'continued', code: 'database_error', effect: 'unknown' }] },
      view: { success: true, count: 1, message: `已${word} 1 个同名` }
    } };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const command = `/${word} 同名`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(`已${word} 1 个同名`));
    assert.ok(view.text.includes('另有项目未完成或需核对'));
    assert.ok(view.text.includes('前段完成不会因后段异常而回滚'));
    assert.ok(view.commands.includes('/储物袋'));
    assert.ok(!view.commands.some(command => /^\/(锁定|解锁)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`${word} authoritative quote and advice retained private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '原返回', command: '/储物袋' }]
    }]));
    const command = `/${word} 装备 101`;
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/储物袋']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
